import "server-only";

import type { CategorisedBy, CategoryType, Prisma } from "@/generated/prisma/client";
import { monthKey, monthStart, shiftMonth } from "@/lib/finance/months";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

import type { TransactionFilters } from "./filters";

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

/** The database filter for a set of page filters, always scoped to the user. */
function whereFor(userId: string, filters: Partial<TransactionFilters>): Prisma.TransactionWhereInput {
  const where: Prisma.TransactionWhereInput = { userId };
  if (filters.category === "review") where.categoryId = null;
  else if (filters.category) where.categoryId = filters.category;
  if (filters.type === "in") where.amountMinor = { gt: 0 };
  if (filters.type === "out") where.amountMinor = { lt: 0 };
  if (filters.month) {
    const start = monthStart(filters.month);
    where.date = { gte: start, lt: monthStart(shiftMonth(filters.month, 1)) };
  }
  if (filters.search) {
    where.OR = [
      { merchant: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
    ];
  }
  return where;
}

/**
 * The signed-in user's transactions, newest first, 50 per page, matching the
 * filters (search, category or "review", month, money in/out).
 * `review: true` is kept for older callers and means category "review".
 */
export async function getTransactions({
  page,
  review = false,
  ...filters
}: Partial<Omit<TransactionFilters, "page">> & {
  page?: unknown;
  review?: boolean;
} = {}): Promise<TransactionPage> {
  const userId = await currentUserId();
  if (!userId) return { transactions: [], page: 1, pageCount: 1, totalCount: 0 };

  const where = whereFor(userId, review ? { ...filters, category: "review" } : filters);
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

/** Every month the user has transactions in, newest first ("2026-10"), for the Date range filter. */
export async function getTransactionMonths(): Promise<string[]> {
  const userId = await currentUserId();
  if (!userId) return [];
  const days = await db.transaction.findMany({
    where: { userId },
    distinct: ["date"],
    select: { date: true },
  });
  return [...new Set(days.map((day) => monthKey(day.date)))].sort().reverse();
}

/** How many transactions the user has in total, for the header. */
export async function getTransactionCount(): Promise<number> {
  const userId = await currentUserId();
  if (!userId) return 0;
  return db.transaction.count({ where: { userId } });
}
