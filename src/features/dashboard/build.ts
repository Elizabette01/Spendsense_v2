/**
 * Everything the dashboard shows, worked out from the user's transactions.
 * Pure: rows in, numbers out, no database. Definitions live in
 * `@/lib/finance/months` and `@/lib/recurring/detect`.
 */

import {
  countsAsIncomeOrSpending,
  currentMonth,
  hasMonth,
  monthKey,
  monthTotals,
  netBalance,
  percentChange,
  shiftMonth,
  type MoneyRow,
} from "@/lib/finance/months";
import {
  activeRecurring,
  MIN_MONTHS,
  mostExpensive,
  nextDue,
  type RecurringPayment,
} from "@/lib/recurring/detect";

export type DashboardRow = MoneyRow & {
  merchant: string;
  categoryId: string | null;
  categoryName: string | null;
};

export type Card = { valueMinor: number; changePercent: number | null };

export type MonthBars = { key: string; incomeMinor: number; expensesMinor: number };

export type BreakdownSlice = {
  id: string;
  name: string;
  amountMinor: number;
  kind: "category" | "other" | "review";
};

export type DashboardData =
  | { hasData: false }
  | {
      hasData: true;
      /** The current month: the latest month with transactions, e.g. "2026-10". */
      month: string;
      cards: { netBalance: Card; income: Card; expenses: Card; savings: Card };
      /** The six months ending at the current month, oldest first. */
      incomeVsExpenses: MonthBars[];
      spendingBreakdown: { totalMinor: number; slices: BreakdownSlice[] };
      recurring: {
        /** Recurring needs MIN_MONTHS (3) months of data to mean anything. */
        enoughData: boolean;
        nextDue: RecurringPayment[];
        mostExpensive: RecurringPayment[];
        count: number;
        monthlyTotalMinor: number;
      };
      topMerchants: { merchant: string; amountMinor: number }[];
    };

const TOP_CATEGORIES = 4;
const TOP_MERCHANTS = 5;
const RECURRING_SHOWN = 3;

/** Money out this month that counts as spending (not transfers), as positive pence. */
function spendingIn(rows: readonly DashboardRow[], month: string): DashboardRow[] {
  return rows.filter(
    (row) => row.amountMinor < 0 && countsAsIncomeOrSpending(row) && monthKey(row.date) === month,
  );
}

export function buildBreakdown(
  rows: readonly DashboardRow[],
  month: string,
): { totalMinor: number; slices: BreakdownSlice[] } {
  const byCategory = new Map<string, { name: string; amountMinor: number }>();
  let reviewMinor = 0;
  let totalMinor = 0;

  for (const row of spendingIn(rows, month)) {
    const amount = -row.amountMinor;
    totalMinor += amount;
    if (row.categoryId === null) {
      reviewMinor += amount;
      continue;
    }
    const current = byCategory.get(row.categoryId) ?? { name: row.categoryName ?? "Unknown", amountMinor: 0 };
    current.amountMinor += amount;
    byCategory.set(row.categoryId, current);
  }

  const ranked = [...byCategory.entries()]
    .map(([id, { name, amountMinor }]) => ({ id, name, amountMinor, kind: "category" as const }))
    .sort((a, b) => b.amountMinor - a.amountMinor);

  const slices: BreakdownSlice[] = ranked.slice(0, TOP_CATEGORIES);
  const otherMinor = ranked.slice(TOP_CATEGORIES).reduce((sum, slice) => sum + slice.amountMinor, 0);
  if (otherMinor > 0) slices.push({ id: "other", name: "Other", amountMinor: otherMinor, kind: "other" });
  if (reviewMinor > 0) {
    slices.push({ id: "review", name: "Needs review", amountMinor: reviewMinor, kind: "review" });
  }
  return { totalMinor, slices };
}

export function buildTopMerchants(
  rows: readonly DashboardRow[],
  month: string,
): { merchant: string; amountMinor: number }[] {
  const byMerchant = new Map<string, { merchant: string; amountMinor: number }>();
  for (const row of spendingIn(rows, month)) {
    const key = row.merchant.trim().toLowerCase();
    const current = byMerchant.get(key) ?? { merchant: row.merchant, amountMinor: 0 };
    current.amountMinor -= row.amountMinor;
    byMerchant.set(key, current);
  }
  return [...byMerchant.values()]
    .sort((a, b) => b.amountMinor - a.amountMinor)
    .slice(0, TOP_MERCHANTS);
}

export function buildDashboard(
  rows: readonly DashboardRow[],
  /** Merchant keys the user marked "Not recurring". */
  dismissedKeys: ReadonlySet<string> = new Set(),
): DashboardData {
  const month = currentMonth(rows);
  if (month === null) return { hasData: false };

  const previous = shiftMonth(month, -1);
  const hasPrevious = hasMonth(rows, previous);
  const now = monthTotals(rows, month);
  const before = hasPrevious ? monthTotals(rows, previous) : null;

  const balanceNow = netBalance(rows, month);
  const balanceBefore = hasPrevious ? netBalance(rows, previous) : null;

  const incomeVsExpenses = Array.from({ length: 6 }, (_, index) => {
    const key = shiftMonth(month, index - 5);
    const totals = monthTotals(rows, key);
    return { key, incomeMinor: totals.incomeMinor, expensesMinor: totals.expensesMinor };
  });

  // The same rule as /recurring: detected, minus dismissed merchants, and
  // only payments still upcoming
  const recurring = activeRecurring(rows, dismissedKeys);
  const monthsWithData = new Set(rows.map((row) => monthKey(row.date))).size;

  return {
    hasData: true,
    month,
    cards: {
      netBalance: { valueMinor: balanceNow, changePercent: percentChange(balanceNow, balanceBefore) },
      income: { valueMinor: now.incomeMinor, changePercent: percentChange(now.incomeMinor, before?.incomeMinor ?? null) },
      expenses: {
        valueMinor: now.expensesMinor,
        changePercent: percentChange(now.expensesMinor, before?.expensesMinor ?? null),
      },
      savings: {
        valueMinor: now.savingsMinor,
        changePercent: percentChange(now.savingsMinor, before?.savingsMinor ?? null),
      },
    },
    incomeVsExpenses,
    spendingBreakdown: buildBreakdown(rows, month),
    recurring: {
      enoughData: monthsWithData >= MIN_MONTHS,
      nextDue: nextDue(recurring, RECURRING_SHOWN),
      mostExpensive: mostExpensive(recurring, RECURRING_SHOWN),
      count: recurring.length,
      monthlyTotalMinor: recurring.reduce((sum, payment) => sum + payment.monthlyCostMinor, 0),
    },
    topMerchants: buildTopMerchants(rows, month),
  };
}
