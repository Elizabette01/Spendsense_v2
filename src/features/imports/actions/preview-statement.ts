"use server";

import { auth } from "@/auth";
import { LIMITS, rateLimit } from "@/lib/rate-limit";

import type { StatementFailure } from "../parsers/analyse";
import { addFingerprints } from "../parsers/fingerprint";
import type { PdfStatementFailure } from "../parsers/pdfStatement";
import { columnMappingSchema, dateOrderSchema } from "../schemas";
import {
  buildPreview,
  isMappableFailure,
  type StatementPreview,
} from "../server/build-preview";
import { findExistingFingerprints, flagDuplicates } from "../server/duplicates";
import {
  MAX_FILE_BYTES,
  readStatement,
  type StatementReadFailure,
} from "../server/read-statement";

export type PreviewFailureReason =
  | "signed_out"
  | "rate_limited"
  | "invalid_input"
  | "unexpected"
  | StatementReadFailure
  | StatementFailure
  | PdfStatementFailure;

export type PreviewState =
  | { status: "idle" }
  | { status: "error"; reason: PreviewFailureReason; message: string }
  | { status: "ready"; preview: StatementPreview };

const FILE_MESSAGE =
  "We couldn't read that file. Please upload a CSV, Excel or PDF statement under 4 MB.";
const STATEMENT_MESSAGE =
  "That doesn't look like a bank statement. Please upload a valid bank statement.";

function fail(reason: PreviewFailureReason, message: string): PreviewState {
  return { status: "error", reason, message };
}

function jsonField(value: FormDataEntryValue | null): unknown {
  if (typeof value !== "string" || value === "") return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function textField(value: FormDataEntryValue | null): unknown {
  return typeof value === "string" && value !== "" ? value : undefined;
}

export async function previewStatement(
  _prevState: PreviewState,
  formData: FormData,
): Promise<PreviewState> {
  // 1. Auth
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return fail("signed_out", "Please sign in again.");

  // 2. Rate limit per user
  const limit = await rateLimit(
    `preview:user:${userId}`,
    LIMITS.previewStatementUser,
  );
  if (!limit.allowed) {
    return fail("rate_limited", "Too many attempts. Please try again in an hour.");
  }

  // 3. Validate input
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
  if (!mapping.success || !dateOrder.success) {
    return fail(
      "invalid_input",
      "Those column choices aren't valid. Please try again.",
    );
  }

  try {
    // 4. Read and analyse
    const bytes = new Uint8Array(await file.arrayBuffer());
    const read = await readStatement({
      fileName: file.name,
      bytes,
      options: { mapping: mapping.data, dateOrder: dateOrder.data },
    });
    if (!read.ok) return fail(read.reason, FILE_MESSAGE);

    // 5. Is it a bank statement?
    const { failure } = read.analysis;
    const canFixByMapping = read.kind === "grid" && isMappableFailure(failure);
    if (failure !== null && !canFixByMapping) {
      return fail(failure, STATEMENT_MESSAGE);
    }

    // 6. Fingerprint, then flag rows matching an earlier upload
    const bankId =
      read.kind === "grid" ? (read.analysis.bank?.id ?? null) : read.analysis.bank;
    const rows = addFingerprints(read.analysis.normalised.rows, bankId);
    const existing = await findExistingFingerprints(
      userId,
      rows.map((row) => row.fingerprint),
    );

    // 7. Build what the dialog shows
    return {
      status: "ready",
      preview: buildPreview(read, flagDuplicates(rows, existing)),
    };
  } catch (error) {
    console.error(
      "[imports] preview failed:",
      error instanceof Error ? error.name : "unknown error",
    );
    return fail("unexpected", "Something went wrong. Please try again.");
  }
}