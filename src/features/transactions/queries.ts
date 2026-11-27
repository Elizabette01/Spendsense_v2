import "server-only";

import type { CategorisedBy, CategoryType, Prisma } from "@/generated/prisma/client";
import { directionOf, type RuleDirection } from "@/lib/categorisation/categorise";
import { deriveMerchant, merchantKey } from "@/lib/categorisation/merchant";
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
  /** An AI guess the user should check ("AI guess, check it's right"). */
  categoryLowConfidence: boolean;
  category: { id: string; name: string; type: CategoryType } | null;
};

/** One row of the grouped "Needs review" view: a merchant in one direction. */
export type ReviewMerchant = {
  /** `merchantKey|direction`: unique per row of the list. */
  key: string;
  merchant: string;
  direction: RuleDirection;
  transactionCount: number;
  /** Sum of the amounts, in pence (negative for money out). */
  totalMinor: number;
  /** Any one of its transactions: the category control saves through it, merchant-wide. */
  transactionId: string;
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
      categoryLowConfidence: true,
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

/** Most groups shown in the review view (the rest appear once these are done). */
export const MAX_REVIEW_MERCHANTS = 200;

/**
 * The "Needs review" view, grouped: one entry per merchant and direction
 * (Amazon money in and Amazon money out are separate), most transactions
 * first. Respects the search, month and in/out filters.
 */
export async function getReviewMerchants(
  filters: Partial<TransactionFilters> = {},
): Promise<ReviewMerchant[]> {
  const userId = await currentUserId();
  if (!userId) return [];

  const rows = await db.transaction.findMany({
    where: whereFor(userId, { ...filters, category: "review" }),
    orderBy: [{ date: "desc" }, { id: "desc" }],
    select: { id: true, merchant: true, description: true, amountMinor: true },
  });

  const groups = new Map<string, ReviewMerchant>();
  for (const row of rows) {
    // Grouped by key, the same way rules match, so "TESCO" and "Tesco" are one entry
    const merchant = row.merchant ?? deriveMerchant(row.description);
    const direction = directionOf(row.amountMinor);
    const key = `${merchantKey(merchant)}|${direction}`;
    const group = groups.get(key);
    if (group) {
      group.transactionCount += 1;
      group.totalMinor += row.amountMinor;
    } else {
      groups.set(key, {
        key,
        merchant,
        direction,
        transactionCount: 1,
        totalMinor: row.amountMinor,
        transactionId: row.id,
      });
    }
  }

  return [...groups.values()]
    .sort(
      (a, b) =>
        b.transactionCount - a.transactionCount ||
        Math.abs(b.totalMinor) - Math.abs(a.totalMinor) ||
        a.merchant.localeCompare(b.merchant),
    )
    .slice(0, MAX_REVIEW_MERCHANTS);
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
