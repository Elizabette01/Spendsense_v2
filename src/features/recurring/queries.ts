import "server-only";

import { merchantKey } from "@/lib/categorisation/merchant";
import { monthKey } from "@/lib/finance/months";
import { loadDismissedKeys, loadUserTransactions } from "@/lib/recurring/data";
import { activeRecurring, type RecurringPayment } from "@/lib/recurring/detect";
import { getSession } from "@/lib/session";

export type RecurringItem = RecurringPayment & { categoryName: string | null };

export type RecurringData = {
  /** Next due first. */
  active: RecurringItem[];
  /** Merchants the user marked "Not recurring", with a name to show. */
  dismissed: { merchantKey: string; merchant: string }[];
  /** How many months of transactions the user has (recurring needs 3). */
  monthsWithData: number;
};

/**
 * The /recurring page. Uses the same data load and the same rule as the
 * dashboard (`activeRecurring` with the user's dismissals), so the two
 * always agree.
 */
export async function getRecurring(): Promise<RecurringData> {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) return { active: [], dismissed: [], monthsWithData: 0 };

  const [rows, dismissedKeys] = await Promise.all([
    loadUserTransactions(userId),
    loadDismissedKeys(userId),
  ]);

  const categoryNames = new Map<string, string>();
  const latestName = new Map<string, { merchant: string; time: number }>();
  for (const row of rows) {
    if (row.categoryId && row.categoryName) categoryNames.set(row.categoryId, row.categoryName);
    const key = merchantKey(row.merchant);
    const seen = latestName.get(key);
    if (!seen || row.date.getTime() > seen.time) {
      latestName.set(key, { merchant: row.merchant, time: row.date.getTime() });
    }
  }

  const active = activeRecurring(rows, dismissedKeys)
    .sort((a, b) => a.nextDue.getTime() - b.nextDue.getTime() || b.monthlyCostMinor - a.monthlyCostMinor)
    .map((payment) => ({
      ...payment,
      categoryName: payment.categoryId ? (categoryNames.get(payment.categoryId) ?? null) : null,
    }));

  const dismissed = [...dismissedKeys]
    .map((key) => ({ merchantKey: key, merchant: latestName.get(key)?.merchant ?? key }))
    .sort((a, b) => a.merchant.localeCompare(b.merchant));

  const monthsWithData = new Set(rows.map((row) => monthKey(row.date))).size;

  return { active, dismissed, monthsWithData };
}
