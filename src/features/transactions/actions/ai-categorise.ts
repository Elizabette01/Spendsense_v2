"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { getAnthropic } from "@/lib/ai/client";
import {
  categoriseRows,
  directionOf,
  type CategoryDecision,
} from "@/lib/categorisation/categorise";
import { deriveMerchant, merchantKey } from "@/lib/categorisation/merchant";
import { db } from "@/lib/db";
import { LIMITS, rateLimit } from "@/lib/rate-limit";

/**
 * "Categorise with AI" on the needs-review view: a backfill for rows that
 * were imported before AI existed, or while the AI was unavailable.
 */

export type AiCategoriseState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "done"; updatedCount: number; stillNeedsReviewMerchantCount: number };

/** The most rows one run looks at. (The AI itself is capped at 300 merchants.) */
const MAX_ROWS = 2_000;

function fail(message: string): AiCategoriseState {
  return { status: "error", message };
}

/**
 * Used with `useActionState`. It reads nothing from the form: who the user is
 * comes from the session, and which rows comes from the database.
 */
export async function aiCategoriseNeedsReview(): Promise<AiCategoriseState> {
  // 1. Auth: the user always comes from the session. The form sends nothing.
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return fail("Please sign in again.");

  // 2. No key: say so plainly (checked before the rate limit, so it costs no attempt)
  if (!getAnthropic()) return fail("AI categorisation isn't available right now.");

  // 3. Rate limit per user: every run can cost money
  const limit = await rateLimit(`ai-categorise:user:${userId}`, LIMITS.aiCategoriseUser);
  if (!limit.allowed) return fail("Too many attempts. Please try again in an hour.");

  try {
    // 4. This user's uncategorised rows (newest first) and saved rules
    const rows = await db.transaction.findMany({
      where: { userId, categoryId: null },
      orderBy: [{ date: "desc" }, { id: "desc" }],
      take: MAX_ROWS,
      select: { id: true, description: true, amountMinor: true },
    });

    let updatedCount = 0;

    if (rows.length > 0) {
      const savedRules = await db.merchantRule.findMany({
        where: { userId },
        select: {
          merchantKey: true,
          direction: true,
          categoryId: true,
          source: true,
          lowConfidence: true,
        },
      });

      // 5. Same categoriser as imports, outside any database transaction
      //    (it may wait on the network)
      const { decisions, newAiRules } = await categoriseRows(rows, savedRules);

      // Group rows that get the same answer, so there's one update per group
      const groups = new Map<string, { decision: CategoryDecision; ids: string[] }>();
      decisions.forEach((decision, index) => {
        if (decision.categoryId === null) return;
        const group = `${decision.categoryId}|${decision.categorisedBy}|${decision.lowConfidence}`;
        const entry = groups.get(group) ?? { decision, ids: [] };
        entry.ids.push(rows[index].id);
        groups.set(group, entry);
      });

      // 6. Save. Each update is scoped by userId, the ids AND categoryId: null,
      //    so a row the user categorised meanwhile is never overwritten.
      updatedCount = await db.$transaction(async (tx) => {
        let count = 0;
        for (const { decision, ids } of groups.values()) {
          const result = await tx.transaction.updateMany({
            where: { userId, id: { in: ids }, categoryId: null },
            data: {
              categoryId: decision.categoryId,
              categorisedBy: decision.categorisedBy,
              categoryLowConfidence: decision.lowConfidence,
            },
          });
          count += result.count;
        }

        // Remember new AI answers; never overwrites an existing (USER) rule
        if (newAiRules.length > 0) {
          await tx.merchantRule.createMany({
            data: newAiRules.map((rule) => ({ ...rule, userId, source: "AI" as const })),
            skipDuplicates: true,
          });
        }
        return count;
      });
    }

    // 7. What's left, counted per merchant + direction (as the review list shows it)
    const remaining = await db.transaction.findMany({
      where: { userId, categoryId: null },
      select: { merchant: true, description: true, amountMinor: true },
    });
    const merchants = new Set(
      remaining.map(
        (row) =>
          `${merchantKey(row.merchant ?? deriveMerchant(row.description))}|${directionOf(row.amountMinor)}`,
      ),
    );

    // 8. Refresh every view that shows categories
    revalidatePath("/transactions");
    revalidatePath("/dashboard");

    return { status: "done", updatedCount, stillNeedsReviewMerchantCount: merchants.size };
  } catch (error) {
    // Only the error's name: messages could contain transaction details
    console.error(
      "[transactions] ai categorise failed:",
      error instanceof Error ? error.name : "unknown error",
    );
    return fail("Something went wrong. Please try again.");
  }
}
