/**
 * Month arithmetic and the money definitions the dashboard and onboarding share.
 * Pure: rows in, numbers out. All months are calendar months in UTC, because
 * transaction dates are calendar days stored at midnight UTC.
 */

export type CategoryKind = "INCOME" | "EXPENSE" | "TRANSFER";

/** The fields every money calculation needs. */
export type MoneyRow = {
  date: Date;
  amountMinor: number;
  /** null when the transaction has no category yet (needs review). */
  categoryType: CategoryKind | null;
};

/** "2026-10" for any day in October 2026 (UTC). */
export function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** The month `offset` months away from `key` ("2026-01", -1 → "2025-12"). */
export function shiftMonth(key: string, offset: number): string {
  const [year, month] = key.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + offset, 1));
  return monthKey(shifted);
}

/** First day of a month key, as a UTC date. */
export function monthStart(key: string): Date {
  const [year, month] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1));
}

/**
 * The "current month": the most recent month that has transactions.
 * Statements are historical, so this is usually not today's month.
 */
export function currentMonth(rows: readonly { date: Date }[]): string | null {
  let latest: string | null = null;
  for (const row of rows) {
    const key = monthKey(row.date);
    if (latest === null || key > latest) latest = key;
  }
  return latest;
}

/** Transfers and savings move your own money: they are never income or spending. */
export function countsAsIncomeOrSpending(row: MoneyRow): boolean {
  return row.categoryType !== "TRANSFER";
}

export type MonthTotals = { incomeMinor: number; expensesMinor: number; savingsMinor: number };

/**
 * Income = money in, expenses = money out (as a positive number), for one month,
 * excluding transfers. Savings = income − expenses (can be negative).
 */
export function monthTotals(rows: readonly MoneyRow[], key: string): MonthTotals {
  let incomeMinor = 0;
  let expensesMinor = 0;
  for (const row of rows) {
    if (monthKey(row.date) !== key || !countsAsIncomeOrSpending(row)) continue;
    if (row.amountMinor > 0) incomeMinor += row.amountMinor;
    else expensesMinor -= row.amountMinor;
  }
  return { incomeMinor, expensesMinor, savingsMinor: incomeMinor - expensesMinor };
}

/** Whether any transaction falls in this month. */
export function hasMonth(rows: readonly { date: Date }[], key: string): boolean {
  return rows.some((row) => monthKey(row.date) === key);
}

/**
 * Percentage change from `previous` to `current`, or null when it can't be
 * worked out (no previous month of data, or a zero base). Uses the size of
 * the base, so going from −£100 to −£50 is +50% (an improvement).
 */
export function percentChange(current: number, previous: number | null): number | null {
  if (previous === null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/** All money in minus all money out, for every row up to and including `throughKey` (or all rows). */
export function netBalance(rows: readonly MoneyRow[], throughKey?: string): number {
  let total = 0;
  for (const row of rows) {
    if (throughKey && monthKey(row.date) > throughKey) continue;
    total += row.amountMinor;
  }
  return total;
}
