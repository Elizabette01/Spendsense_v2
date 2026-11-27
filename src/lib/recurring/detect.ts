/**
 * Recurring-payment detection. Pure; nothing is stored: it's worked out each
 * time the data is read. (B9 Phase 3 tightened it.)
 *
 * Never recurring:
 *   - transfers and savings (not payments);
 *   - the five everyday categories (eating out, groceries, shopping,
 *     transport, entertainment). The same lunch at the same café every month
 *     looks exactly like a subscription by amount and date, but it isn't one;
 *   - merchants the user dismissed with "Not recurring".
 * Uncategorised rows and "Sent to people" stay eligible (rent paid to a
 * landlord by standing order is a real recurring payment).
 *
 * A merchant (grouped by merchant key, the same key rules and dismissals
 * use) is recurring when:
 *   1. it has money-out payments in at least THREE different months whose
 *      amounts are within 10% of its typical (median) amount. Two months can
 *      happen by chance; three rarely does, and
 *   2. it's paid about monthly, not many times a month: at most 2 payments
 *      per active month on average. (Without this, frequent small spends
 *      such as bus fares would always find two similar amounts.)
 *   3. most of its payments (at least 75%) are close to the typical amount.
 *      A subscription always is; a supermarket shop is only by chance.
 *   4. those payments leave on about the same day each month (within
 *      7 days of the usual day).
 */

import { merchantKey } from "@/lib/categorisation/merchant";
import { monthKey, type CategoryKind } from "@/lib/finance/months";

export type RecurringInput = {
  date: Date;
  amountMinor: number;
  merchant: string;
  categoryId: string | null;
  categoryType: CategoryKind | null;
};

export type RecurringPayment = {
  /** The key used for dismissals ("Not recurring"). */
  merchantKey: string;
  merchant: string;
  /** The category of its latest payment, if any. */
  categoryId: string | null;
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

/** Everyday spending is never recurring, however regular it looks. */
export const EVERYDAY_CATEGORY_IDS: ReadonlySet<string> = new Set([
  "sys_eating_out",
  "sys_groceries",
  "sys_shopping",
  "sys_transport",
  "sys_entertainment",
]);

/** Different months of similar payments needed. */
export const MIN_MONTHS = 3;

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

export function detectRecurring(
  rows: readonly RecurringInput[],
  dismissedKeys: ReadonlySet<string> = new Set(),
): RecurringPayment[] {
  // 1. Money-out payments, grouped by merchant key. Not transfers, not
  //    everyday spending, not merchants the user said aren't recurring.
  const byMerchant = new Map<string, RecurringInput[]>();
  for (const row of rows) {
    if (row.amountMinor >= 0 || row.categoryType === "TRANSFER") continue;
    if (row.categoryId !== null && EVERYDAY_CATEGORY_IDS.has(row.categoryId)) continue;
    const key = merchantKey(row.merchant);
    if (!key || dismissedKeys.has(key)) continue;
    byMerchant.set(key, [...(byMerchant.get(key) ?? []), row]);
  }

  const found: RecurringPayment[] = [];
  for (const [key, payments] of byMerchant) {
    // 2. Paid about monthly, not many times a month
    const months = new Set(payments.map((payment) => monthKey(payment.date)));
    if (payments.length / months.size > MAX_PAYMENTS_PER_MONTH) continue;

    // 3. Similar amounts in at least three different months
    const typical = median(payments.map((payment) => -payment.amountMinor));
    const similar = payments.filter(
      (payment) => Math.abs(-payment.amountMinor - typical) <= typical * TOLERANCE,
    );
    if (new Set(similar.map((payment) => monthKey(payment.date))).size < MIN_MONTHS) continue;

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
      merchantKey: key,
      merchant: last.merchant,
      categoryId: last.categoryId,
      typicalAmountMinor,
      dayOfMonth,
      lastPaid: last.date,
      nextDue: oneMonthLater(last.date),
      monthlyCostMinor: typicalAmountMinor,
    });
  }
  return found;
}

/**
 * What the app shows as recurring: detected, minus dismissed merchants, and
 * only payments still upcoming. One already overdue by the latest
 * transaction has probably stopped. Used by the dashboard and /recurring.
 */
export function activeRecurring(
  rows: readonly RecurringInput[],
  dismissedKeys: ReadonlySet<string> = new Set(),
): RecurringPayment[] {
  if (rows.length === 0) return [];
  const latest = Math.max(...rows.map((row) => row.date.getTime()));
  return detectRecurring(rows, dismissedKeys).filter((payment) => payment.nextDue.getTime() > latest);
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
