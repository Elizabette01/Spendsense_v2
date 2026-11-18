/**
 * The numbers on the last onboarding screen ("Here is what we found").
 * Pure: rows in, numbers out, no database. Uses the same money definitions as
 * the dashboard (`@/lib/finance/months`, `@/lib/recurring/detect`), so the two
 * screens never disagree.
 */

import {
  countsAsIncomeOrSpending,
  currentMonth,
  hasMonth,
  monthKey,
  monthTotals,
  shiftMonth,
  type MoneyRow,
} from "@/lib/finance/months";
import { detectRecurring } from "@/lib/recurring/detect";

export type SummaryRow = MoneyRow & {
  merchant: string;
  categoryId: string | null;
  categoryName: string | null;
};

export type OnboardingSummary = {
  /** The latest month with transactions ("2026-10"): the month every tile describes. */
  month: string;
  transactionCount: number;
  /** Biggest spending category this month (uncategorised spending left out). */
  topCategory: { name: string; amountMinor: number } | null;
  recurring: {
    /** Recurring needs two months of data to mean anything. */
    enoughData: boolean;
    count: number;
    monthlyTotalMinor: number;
  };
  /**
   * Saved = income − spending this month; rate = saved ÷ income, as a whole percent.
   * Income comes from the statement, or from step 1's answer if the statement
   * has no income this month. Null when there's no income to divide by.
   */
  saving: { ratePercent: number; savedMinor: number; incomeFrom: "statement" | "answer" } | null;
  /**
   * "SpendSense noticed": the top category this month against the month before.
   * Only when both months have data and the change is at least 1%.
   */
  noticed: { categoryName: string; changePercent: number; previousMonth: string } | null;
};

/** Spending per category in one month, positive pence. */
function spendingByCategory(rows: readonly SummaryRow[], month: string) {
  const totals = new Map<string, { name: string; amountMinor: number }>();
  for (const row of rows) {
    if (row.amountMinor >= 0 || !countsAsIncomeOrSpending(row) || row.categoryId === null) continue;
    if (monthKey(row.date) !== month) continue;
    const current = totals.get(row.categoryId) ?? { name: row.categoryName ?? "Unknown", amountMinor: 0 };
    current.amountMinor -= row.amountMinor;
    totals.set(row.categoryId, current);
  }
  return totals;
}

export function buildOnboardingSummary(
  rows: readonly SummaryRow[],
  answeredIncomeMinor: number | null,
): OnboardingSummary | null {
  const month = currentMonth(rows);
  if (month === null) return null;

  // Top category
  const thisMonth = spendingByCategory(rows, month);
  const top = [...thisMonth.entries()].sort((a, b) => b[1].amountMinor - a[1].amountMinor)[0];
  const topCategory = top ? { name: top[1].name, amountMinor: top[1].amountMinor } : null;

  // Recurring, as on the dashboard: payments already overdue have probably stopped
  const latest = Math.max(...rows.map((row) => row.date.getTime()));
  const recurring = detectRecurring(rows).filter((payment) => payment.nextDue.getTime() > latest);
  const monthsWithData = new Set(rows.map((row) => monthKey(row.date))).size;

  // Saving rate
  const totals = monthTotals(rows, month);
  let saving: OnboardingSummary["saving"] = null;
  if (totals.incomeMinor > 0) {
    saving = {
      ratePercent: Math.round((totals.savingsMinor / totals.incomeMinor) * 100),
      savedMinor: totals.savingsMinor,
      incomeFrom: "statement",
    };
  } else if (answeredIncomeMinor !== null && answeredIncomeMinor > 0) {
    const savedMinor = answeredIncomeMinor - totals.expensesMinor;
    saving = {
      ratePercent: Math.round((savedMinor / answeredIncomeMinor) * 100),
      savedMinor,
      incomeFrom: "answer",
    };
  }

  // "SpendSense noticed": needs the previous month too
  let noticed: OnboardingSummary["noticed"] = null;
  const previousMonth = shiftMonth(month, -1);
  if (top && hasMonth(rows, previousMonth)) {
    const before = spendingByCategory(rows, previousMonth).get(top[0])?.amountMinor ?? 0;
    if (before > 0) {
      const changePercent = Math.round(((top[1].amountMinor - before) / before) * 100);
      if (changePercent !== 0) noticed = { categoryName: top[1].name, changePercent, previousMonth };
    }
  }

  return {
    month,
    transactionCount: rows.length,
    topCategory,
    recurring: {
      enoughData: monthsWithData >= 2,
      count: recurring.length,
      monthlyTotalMinor: recurring.reduce((sum, payment) => sum + payment.monthlyCostMinor, 0),
    },
    saving,
    noticed,
  };
}
