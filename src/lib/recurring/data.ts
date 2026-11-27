import "server-only";

import { cache } from "react";

import type { CategoryKind } from "@/lib/finance/months";
import { db } from "@/lib/db";

/**
 * The data load shared by the dashboard and /recurring, so both always show
 * the same recurring payments. (Features can't import from each other, so
 * it lives in `src/lib/`.) Wrapped in React's `cache`: one database read per
 * request, however many sections use it.
 *
 * Callers pass the user id from the session. Every query is scoped to it.
 */

export type UserTransactionRow = {
  date: Date;
  amountMinor: number;
  /** The cleaned merchant, or the bank description for older rows. */
  merchant: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryType: CategoryKind | null;
};

export const loadUserTransactions = cache(async (userId: string): Promise<UserTransactionRow[]> => {
  const transactions = await db.transaction.findMany({
    where: { userId },
    select: {
      date: true,
      amountMinor: true,
      merchant: true,
      description: true,
      categoryId: true,
      category: { select: { name: true, type: true } },
    },
  });
  return transactions.map((transaction) => ({
    date: transaction.date,
    amountMinor: transaction.amountMinor,
    merchant: transaction.merchant ?? transaction.description,
    categoryId: transaction.categoryId,
    categoryName: transaction.category?.name ?? null,
    categoryType: transaction.category?.type ?? null,
  }));
});

/** Merchant keys the user marked "Not recurring". */
export const loadDismissedKeys = cache(async (userId: string): Promise<Set<string>> => {
  const dismissals = await db.recurringDismissal.findMany({
    where: { userId },
    select: { merchantKey: true },
  });
  return new Set(dismissals.map((dismissal) => dismissal.merchantKey));
});
