import "server-only";

import type { CategorisedBy, CategoryType } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

export const TRANSACTIONS_PER_PAGE = 50;

export type TransactionListItem = {
  id: string;
  date: Date;
  description: string;
  merchant: string | null;
  amountMinor: number;
  categorisedBy: CategorisedBy | null;
  category: { id: string; name: string; type: CategoryType } | null;
};

export type TransactionPage = {
  transactions: TransactionListItem[];
  /** The page actually shown (out-of-range requests are clamped). */
  page: number;
  pageCount: number;
  totalCount: number;
};

export type CategoryOption = {
  id: string;
  name: string;
  type: CategoryType;
  /** true for the user's own categories, false for system ones. */
  isOwn: boolean;
};

async function currentUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user?.id ?? null;
}

/** A whole page number ≥ 1 from anything (for example a URL value). */
function toPage(value: unknown): number {
  const page = typeof value === "number" ? value : Number(value);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

/**
 * The signed-in user's transactions, newest first, 50 per page.
 * `review: true` returns only rows with no category ("needs review").
 */
export async function getTransactions({
  page,
  review = false,
}: {
  page?: unknown;
  review?: boolean;
} = {}): Promise<TransactionPage> {
  const userId = await currentUserId();
  if (!userId) return { transactions: [], page: 1, pageCount: 1, totalCount: 0 };

  const where = review ? { userId, categoryId: null } : { userId };
  const totalCount = await db.transaction.count({ where });
  const pageCount = Math.max(1, Math.ceil(totalCount / TRANSACTIONS_PER_PAGE));
  const current = Math.min(toPage(page), pageCount);

  const transactions = await db.transaction.findMany({
    where,
    // Same-day rows keep a stable order across pages
    orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    skip: (current - 1) * TRANSACTIONS_PER_PAGE,
    take: TRANSACTIONS_PER_PAGE,
    select: {
      id: true,
      date: true,
      description: true,
      merchant: true,
      amountMinor: true,
      categorisedBy: true,
      category: { select: { id: true, name: true, type: true } },
    },
  });

  return { transactions, page: current, pageCount, totalCount };
}

/** System categories plus the user's own, for the category picker. */
export async function getCategories(): Promise<CategoryOption[]> {
  const userId = await currentUserId();
  if (!userId) return [];

  const categories = await db.category.findMany({
    where: { OR: [{ userId: null }, { userId }] },
    orderBy: [{ type: "asc" }, { name: "asc" }],
    select: { id: true, name: true, type: true, userId: true },
  });

  return categories.map(({ userId: owner, ...category }) => ({
    ...category,
    isOwn: owner !== null,
  }));
}

/** How many of the user's transactions have no category yet. */
export async function getNeedsReviewCount(): Promise<number> {
  const userId = await currentUserId();
  if (!userId) return 0;
  return db.transaction.count({ where: { userId, categoryId: null } });
}
