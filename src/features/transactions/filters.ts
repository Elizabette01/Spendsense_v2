/**
 * The transactions page filters, read from the URL. Pure and browser-safe.
 * URL values are untrusted: anything unknown or malformed is ignored, never
 * passed to the database as-is.
 */

export type TransactionType = "in" | "out";

export type TransactionFilters = {
  /** Text to find in the merchant or bank description. */
  search: string | null;
  /** A category id, or "review" for rows with no category. */
  category: string | null;
  /** A calendar month, "2026-10". */
  month: string | null;
  type: TransactionType | null;
  page: number;
};

export const MAX_SEARCH_LENGTH = 100;
const ID = /^[A-Za-z0-9_-]{1,64}$/;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

type RawParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function parseTransactionFilters(params: RawParams): TransactionFilters {
  const search = single(params.q)?.trim().slice(0, MAX_SEARCH_LENGTH) || null;

  // `?review=1` (used by the import Done screen) means the same as category=review
  const rawCategory = single(params.review) === "1" ? "review" : single(params.category);
  const category = rawCategory && ID.test(rawCategory) ? rawCategory : null;

  const rawMonth = single(params.month);
  const month = rawMonth && MONTH.test(rawMonth) ? rawMonth : null;

  const rawType = single(params.type);
  const type = rawType === "in" || rawType === "out" ? rawType : null;

  const pageNumber = Number(single(params.page));
  const page = Number.isInteger(pageNumber) && pageNumber >= 1 ? pageNumber : 1;

  return { search, category, month, type, page };
}

/** The URL for a set of filters (empty ones left out; page 1 left out). */
export function filtersHref(filters: Partial<TransactionFilters>): string {
  const params = new URLSearchParams();
  if (filters.search) params.set("q", filters.search);
  if (filters.category) params.set("category", filters.category);
  if (filters.month) params.set("month", filters.month);
  if (filters.type) params.set("type", filters.type);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  const query = params.toString();
  return query ? `/transactions?${query}` : "/transactions";
}

/** Page numbers to show: always first and last, a window around the current page, gaps as null. */
export function pageList(current: number, count: number): (number | null)[] {
  const pages = new Set([1, count, current - 1, current, current + 1].filter((p) => p >= 1 && p <= count));
  const sorted = [...pages].sort((a, b) => a - b);
  const result: (number | null)[] = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) result.push(null);
    result.push(page);
  });
  return result;
}
