import "server-only";

import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

import { buildOnboardingSummary, type OnboardingSummary } from "./summary";

export type OnboardingState = "needed" | "done";

/**
 * Pure rule, kept separate so it can be tested: onboarding is needed only for
 * a user who hasn't finished or skipped it and has no statements yet. Anyone
 * who already uploaded through /imports never gets sent back to it.
 */
export function onboardingStateFor(
  record: { completedAt: Date | null; skippedAt: Date | null } | null,
  statementCount: number,
): OnboardingState {
  if (record?.completedAt || record?.skippedAt) return "done";
  return statementCount > 0 ? "done" : "needed";
}

/** "needed" or "done" for the signed-in user (no session counts as "done": nothing to redirect). */
export async function getOnboardingState(): Promise<OnboardingState> {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) return "done";

  const [record, statementCount] = await Promise.all([
    db.onboarding.findUnique({ where: { userId }, select: { completedAt: true, skippedAt: true } }),
    db.statement.count({ where: { userId } }),
  ]);
  return onboardingStateFor(record, statementCount);
}

/** Whether the signed-in user has completed or skipped onboarding (statements don't count here). */
export async function hasFinishedOnboarding(): Promise<boolean> {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) return false;

  const record = await db.onboarding.findUnique({
    where: { userId },
    select: { completedAt: true, skippedAt: true },
  });
  return Boolean(record?.completedAt || record?.skippedAt);
}

/**
 * The last onboarding screen: top category, recurring payments and saving
 * rate for the latest month. Null when the user has no transactions.
 */
export async function getOnboardingSummary(): Promise<OnboardingSummary | null> {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) return null;

  const [record, transactions] = await Promise.all([
    db.onboarding.findUnique({ where: { userId }, select: { monthlyIncomeMinor: true } }),
    db.transaction.findMany({
      where: { userId },
      select: {
        date: true,
        amountMinor: true,
        merchant: true,
        description: true,
        categoryId: true,
        category: { select: { name: true, type: true } },
      },
    }),
  ]);

  return buildOnboardingSummary(
    transactions.map((transaction) => ({
      date: transaction.date,
      amountMinor: transaction.amountMinor,
      merchant: transaction.merchant ?? transaction.description,
      categoryId: transaction.categoryId,
      categoryName: transaction.category?.name ?? null,
      categoryType: transaction.category?.type ?? null,
    })),
    record?.monthlyIncomeMinor ?? null,
  );
}
