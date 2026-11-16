/**
 * Simple recurring-payment detection (Step 8 will refine it). Pure; nothing
 * is stored: it's worked out each time the data is read.
 *
 * A merchant is recurring when:
 *   1. it has money-out payments in at least two different months whose
 *      amounts are within 10% of its typical (median) amount, and
 *   2. it's paid about monthly, not many times a month: at most 2 payments
 *      per active month on average. (Without this, frequent small spends
 *      such as bus fares would always find two similar amounts.)
 *   3. most of its payments (at least 75%) are close to the typical amount.
 *      A subscription always is; a supermarket shop is only by chance.
 *   4. those payments leave on about the same day each month (within
 *      7 days of the usual day).
 * Transfers and savings are not payments, so they're left out.
 */

import { monthKey, type CategoryKind } from "@/lib/finance/months";

export type RecurringInput = {
  date: Date;
  amountMinor: number;
  merchant: string;
  categoryType: CategoryKind | null;
};

export type RecurringPayment = {
  merchant: string;
  /** Typical payment, positive pence. */
  typicalAmountMinor: number;
  /** Usual day of the month it leaves (1–31). */
  dayOfMonth: number;
  lastPaid: Date;
  /** One month after the last payment (clamped to the month's length). */
  nextDue: Date;
  /** What it costs per month: the typical amount. */
  monthlyCostMinor: number;
};

const TOLERANCE = 0.1;
const MAX_PAYMENTS_PER_MONTH = 2;
const MIN_SIMILAR_SHARE = 0.75;
const MAX_DAY_SPREAD = 7;

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

/** The same day next month, or the last day if next month is shorter (31 Jan → 28 Feb). */
export function oneMonthLater(date: Date): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(date.getUTCDate(), lastDay)));
}

export function detectRecurring(rows: readonly RecurringInput[]): RecurringPayment[] {
  // 1. Money-out payments (not transfers), grouped by merchant name, case-insensitively
  const byMerchant = new Map<string, RecurringInput[]>();
  for (const row of rows) {
    if (row.amountMinor >= 0 || row.categoryType === "TRANSFER") continue;
    const key = row.merchant.trim().toLowerCase();
    if (!key) continue;
    byMerchant.set(key, [...(byMerchant.get(key) ?? []), row]);
  }

  const found: RecurringPayment[] = [];
  for (const payments of byMerchant.values()) {
    // 2. Paid about monthly, not many times a month
    const months = new Set(payments.map((payment) => monthKey(payment.date)));
    if (payments.length / months.size > MAX_PAYMENTS_PER_MONTH) continue;

    // 3. Similar amounts in at least two different months
    const typical = median(payments.map((payment) => -payment.amountMinor));
    const similar = payments.filter(
      (payment) => Math.abs(-payment.amountMinor - typical) <= typical * TOLERANCE,
    );
    if (new Set(similar.map((payment) => monthKey(payment.date))).size < 2) continue;

    // 4. Consistent: most payments are close to the usual amount
    if (similar.length / payments.length < MIN_SIMILAR_SHARE) continue;

    // 5. On about the same day each month
    const dayOfMonth = median(similar.map((payment) => payment.date.getUTCDate()));
    if (similar.some((payment) => Math.abs(payment.date.getUTCDate() - dayOfMonth) > MAX_DAY_SPREAD)) {
      continue;
    }

    const sorted = [...similar].sort((a, b) => a.date.getTime() - b.date.getTime());
    const last = sorted[sorted.length - 1];
    const typicalAmountMinor = median(similar.map((payment) => -payment.amountMinor));

    found.push({
      merchant: last.merchant,
      typicalAmountMinor,
      dayOfMonth,
      lastPaid: last.date,
      nextDue: oneMonthLater(last.date),
      monthlyCostMinor: typicalAmountMinor,
    });
  }
  return found;
}

/** Soonest next-due first; ties by bigger cost. */
export function nextDue(payments: readonly RecurringPayment[], count: number): RecurringPayment[] {
  return [...payments]
    .sort((a, b) => a.nextDue.getTime() - b.nextDue.getTime() || b.monthlyCostMinor - a.monthlyCostMinor)
    .slice(0, count);
}

/** Highest monthly cost first. */
export function mostExpensive(payments: readonly RecurringPayment[], count: number): RecurringPayment[] {
  return [...payments].sort((a, b) => b.monthlyCostMinor - a.monthlyCostMinor).slice(0, count);
}
