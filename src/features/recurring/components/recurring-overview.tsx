import { ButtonLink } from "@/components/ui/button";
import { formatMoney, plural } from "@/lib/format";
import { MIN_MONTHS } from "@/lib/recurring/detect";

import { getRecurring } from "../queries";
import { RecurringManager } from "./recurring-manager";

/** Summary, list and hidden merchants. Reads the session: render inside <Suspense>. */
export async function RecurringOverview() {
  const { active, dismissed, monthsWithData } = await getRecurring();
  const monthlyTotal = active.reduce((sum, item) => sum + item.monthlyCostMinor, 0);

  return (
    <div className="flex flex-col gap-4">
      {active.length > 0 ? (
        <dl className="grid grid-cols-2 gap-4 rounded-card bg-card p-5 shadow-card sm:max-w-md">
          <div className="flex flex-col-reverse">
            <dt className="text-label text-foreground-muted">Recurring payments</dt>
            <dd className="text-stat text-heading">{active.length.toLocaleString("en-GB")}</dd>
          </div>
          <div className="flex flex-col-reverse">
            <dt className="text-label text-foreground-muted">Total each month</dt>
            <dd className="text-stat text-heading">{formatMoney(monthlyTotal)}</dd>
          </div>
        </dl>
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-card bg-card p-6 shadow-card">
          <p className="text-card-title text-heading">No recurring payments found yet.</p>
          <p className="text-body text-foreground-secondary">
            {monthsWithData < MIN_MONTHS
              ? `We need at least ${MIN_MONTHS} months of statements.`
              : `We look for payments to the same place on about the same day, for at least ${MIN_MONTHS} months.`}
            {dismissed.length > 0 && ` ${plural(dismissed.length, "merchant")} hidden below.`}
          </p>
          {monthsWithData < MIN_MONTHS && <ButtonLink href="/imports">Upload a statement</ButtonLink>}
        </div>
      )}

      <RecurringManager active={active} dismissed={dismissed} />
    </div>
  );
}

export function RecurringOverviewSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-4">
      <div className="h-24 rounded-card bg-card sm:max-w-md" />
      {[0, 1, 2].map((key) => (
        <div key={key} className="h-20 rounded-card bg-card" />
      ))}
    </div>
  );
}
