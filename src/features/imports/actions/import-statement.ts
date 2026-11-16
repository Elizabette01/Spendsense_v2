"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { auth } from "@/auth";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { LIMITS, rateLimit } from "@/lib/rate-limit";

import { isoDateToUtcDate } from "../parsers/dates";
import { addFingerprints, type FingerprintedRow } from "../parsers/fingerprint";
import {
  columnMappingSchema,
  dateOrderSchema,
  duplicateDecisionsSchema,
} from "../schemas";
import {
  assignFreeFingerprints,
  findExistingFingerprints,
  flagDuplicates,
} from "../server/duplicates";
import { bankNameOf } from "../server/build-preview";
import { jsonField, textField } from "../server/form-fields";
import { MAX_FILE_BYTES, readStatement } from "../server/read-statement";
import type { PreviewFailureReason } from "./preview-statement";

export type ImportFailureReason =
  | PreviewFailureReason
  | "needs_decision"
  | "nothing_to_import"
  | "conflict";

export type ImportResult = {
  statementId: string;
  importedCount: number;
  /** Flagged rows the user chose to skip. */
  duplicateCount: number;
  /** Zero-amount rows. */
  skippedCount: number;
  /** Rows that couldn't be read. */
  issueCount: number;
  /** Filled in Phase 2 (0 until then). */
  categorisedCount: number;
  /** Filled in Phase 2 (= importedCount until then). */
  needsReviewCount: number;
  /** ISO date (YYYY-MM-DD). */
  periodStart: string | null;
  periodEnd: string | null;
};

export type ImportState =
  | { status: "idle" }
  | { status: "error"; reason: ImportFailureReason; message: string }
  | { status: "done"; result: ImportResult };

const FILE_MESSAGE =
  "We couldn't read that file. Please upload a CSV, Excel or PDF statement under 4 MB.";
const STATEMENT_MESSAGE =
  "That doesn't look like a bank statement. Please upload a valid bank statement.";
const UNEXPECTED_MESSAGE = "Something went wrong. Please try again.";

/** createMany batch size: keeps each insert well under Postgres' parameter limit. */
const INSERT_CHUNK = 1_000;
/** Generous, because a file can hold up to 20,000 rows. */
const TRANSACTION_TIMEOUT_MS = 60_000;

function fail(reason: ImportFailureReason, message: string): ImportState {
  return { status: "error", reason, message };
}

export async function importStatement(
  _prevState: ImportState,
  formData: FormData,
): Promise<ImportState> {
  // 1. Auth: the user always comes from the session, never the form
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return fail("signed_out", "Please sign in again.");

  // 2. Rate limit per user
  const limit = await rateLimit(
    `import:user:${userId}`,
    LIMITS.importStatementUser,
  );
  if (!limit.allowed) {
    return fail("rate_limited", "Too many attempts. Please try again in an hour.");
  }

  // 3. Validate input (as in preview, plus the duplicate decisions)
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return fail("invalid_input", "Please choose a file to upload.");
  }
  if (file.size > MAX_FILE_BYTES) return fail("too_large", FILE_MESSAGE);

  const mapping = columnMappingSchema
    .optional()
    .safeParse(jsonField(formData.get("mapping")));
  const dateOrder = dateOrderSchema
    .optional()
    .safeParse(textField(formData.get("dateOrder")));
  const decisions = duplicateDecisionsSchema.safeParse(
    jsonField(formData.get("decisions")),
  );
  if (!mapping.success || !dateOrder.success || !decisions.success) {
    return fail(
      "invalid_input",
      "Those choices aren't valid. Please check the file again.",
    );
  }

  try {
    // 4. Read and analyse the file again: the server kept nothing from the preview
    const bytes = new Uint8Array(await file.arrayBuffer());
    const read = await readStatement({
      fileName: file.name,
      bytes,
      options: { mapping: mapping.data, dateOrder: dateOrder.data },
    });
    if (!read.ok) return fail(read.reason, FILE_MESSAGE);

    // 5. Any statement failure stops the import. Unlike the preview, a missing
    //    date or amount column gets no pass: the right mapping clears it.
    const { failure } = read.analysis;
    if (failure !== null) return fail(failure, STATEMENT_MESSAGE);

    // 6. Fingerprint and flag on fresh data
    const bankId =
      read.kind === "grid" ? (read.analysis.bank?.id ?? null) : read.analysis.bank;
    const rows = addFingerprints(read.analysis.normalised.rows, bankId);
    const existing = await findExistingFingerprints(
      userId,
      rows.map((row) => row.fingerprint),
    );
    const flagged = flagDuplicates(rows, existing);

    // 7. Apply the user's decision to every flagged row
    const { defaultChoice, overrides } = decisions.data;
    const toSave: (FingerprintedRow | null)[] = [];
    const importAnyway: { position: number; row: FingerprintedRow }[] = [];
    let duplicateCount = 0;

    for (const { duplicate, ...row } of flagged) {
      if (!duplicate) {
        toSave.push(row);
        continue;
      }
      const choice = overrides[row.fingerprint] ?? defaultChoice;
      if (choice === undefined) {
        return fail(
          "needs_decision",
          "Something changed since the preview. Please check the file again.",
        );
      }
      if (choice === "skip") {
        duplicateCount += 1;
      } else {
        importAnyway.push({ position: toSave.length, row });
        toSave.push(null); // filled once it has a free fingerprint
      }
    }

    if (importAnyway.length > 0) {
      const assigned = await assignFreeFingerprints(
        userId,
        importAnyway.map(({ row }) => row),
        new Set(rows.map((row) => row.fingerprint)),
      );
      if (!assigned.ok) return fail("unexpected", UNEXPECTED_MESSAGE);
      importAnyway.forEach(({ position }, index) => {
        toSave[position] = assigned.rows[index];
      });
    }

    const finalRows = toSave.filter((row): row is FingerprintedRow => row !== null);

    // 8. Nothing left: save nothing at all
    if (finalRows.length === 0) {
      return fail(
        "nothing_to_import",
        "There are no new transactions to import from this file.",
      );
    }

    // The statement covers every dated row in the file, including skipped duplicates
    let periodStart: string | null = null;
    let periodEnd: string | null = null;
    for (const row of rows) {
      if (periodStart === null || row.date < periodStart) periodStart = row.date;
      if (periodEnd === null || row.date > periodEnd) periodEnd = row.date;
    }

    const skippedCount = read.analysis.normalised.skippedZero;

    // 9. Save the statement and its transactions together: all or nothing
    const statementId = await db.$transaction(
      async (tx) => {
        const statement = await tx.statement.create({
          data: {
            userId,
            fileName: read.fileName,
            fileType: read.fileType,
            bankName: bankNameOf(read),
            status: "COMPLETED",
            periodStart: periodStart ? isoDateToUtcDate(periodStart) : null,
            periodEnd: periodEnd ? isoDateToUtcDate(periodEnd) : null,
            importedCount: finalRows.length,
            duplicateCount,
            skippedCount,
          },
          select: { id: true },
        });

        for (let start = 0; start < finalRows.length; start += INSERT_CHUNK) {
          await tx.transaction.createMany({
            data: finalRows.slice(start, start + INSERT_CHUNK).map((row) => ({
              userId,
              statementId: statement.id,
              date: isoDateToUtcDate(row.date),
              description: row.description,
              amountMinor: row.amountMinor,
              fingerprint: row.fingerprint,
            })),
          });
        }

        return statement.id;
      },
      { timeout: TRANSACTION_TIMEOUT_MS },
    );

    // 11. Record the import for activity metrics, after the response is sent
    after(async () => {
      try {
        await db.activityEvent.create({
          data: { type: "STATEMENT_IMPORT", userId },
        });
      } catch (error) {
        console.error(
          "[imports] activity event failed:",
          error instanceof Error ? error.name : "unknown error",
        );
      }
    });

    // 12. Refresh every view that shows this user's statements or transactions
    revalidatePath("/imports");
    revalidatePath("/transactions");
    revalidatePath("/dashboard");

    return {
      status: "done",
      result: {
        statementId,
        importedCount: finalRows.length,
        duplicateCount,
        skippedCount,
        issueCount: read.analysis.normalised.issues.length,
        categorisedCount: 0,
        needsReviewCount: finalRows.length,
        periodStart,
        periodEnd,
      },
    };
  } catch (error) {
    // 10. Two imports of the same rows racing: one wins, the other asks to retry
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return fail("conflict", "Please try again.");
    }
    // Only the error's name: messages can contain file contents
    console.error(
      "[imports] import failed:",
      error instanceof Error ? error.name : "unknown error",
    );
    return fail("unexpected", UNEXPECTED_MESSAGE);
  }
}
