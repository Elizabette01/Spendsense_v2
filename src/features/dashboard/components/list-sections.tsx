import { formatMoney } from "@/lib/format";
import type { RecurringPayment } from "@/lib/recurring/detect";

import { SectionCard } from "./section-card";

const DUE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

function ordinal(day: number): string {
  const suffix = day % 10 === 1 && day !== 11 ? "st" : day % 10 === 2 && day !== 12 ? "nd" : day % 10 === 3 && day !== 13 ? "rd" : "th";
  return `${day}${suffix}`;
}

function PaymentRow({ payment, detail }: { payment: RecurringPayment; detail: string }) {
  return (
    <li className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center rounded-control bg-accent text-body font-semibold text-accent-foreground"
      >
        {payment.merchant.charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-semibold text-foreground">{payment.merchant}</p>
        <p className="text-label text-foreground-muted">{detail}</p>
      </div>
      <p className="text-body font-semibold text-heading">{formatMoney(payment.monthlyCostMinor)}</p>
    </li>
  );
}

export function RecurringSection({
  enoughData,
  nextDue,
  mostExpensive,
}: {
  enoughData: boolean;
  nextDue: RecurringPayment[];
  mostExpensive: RecurringPayment[];
}) {
  return (
    <SectionCard title="Recurring payments" subtitle="Upcoming and top costs" className="lg:col-span-2">
      {!enoughData ? (
        <p className="text-body text-foreground-secondary">
          Not enough data yet. Recurring payments show up once you have at least two months of
          transactions.
        </p>
      ) : nextDue.length === 0 ? (
        <p className="text-body text-foreground-secondary">No recurring payments found yet.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 md:divide-x md:divide-divider">
          <div className="flex flex-col gap-3 md:pr-6">
            <h3 className="text-overline tracking-wide text-foreground-muted uppercase">Next due</h3>
            <ul className="flex flex-col gap-4">
              {nextDue.map((payment) => (
                <PaymentRow
                  key={payment.merchant}
                  payment={payment}
                  detail={`Due ${DUE.format(payment.nextDue)}`}
                />
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-3 md:pl-6">
            <h3 className="text-overline tracking-wide text-foreground-muted uppercase">Most expensive</h3>
            <ul className="flex flex-col gap-4">
              {mostExpensive.map((payment) => (
                <PaymentRow
                  key={payment.merchant}
                  payment={payment}
                  detail={`Usually on the ${ordinal(payment.dayOfMonth)}`}
                />
              ))}
            </ul>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

export function TopMerchantsSection({
  monthName,
  merchants,
}: {
  monthName: string;
  merchants: { merchant: string; amountMinor: number }[];
}) {
  const top = merchants[0]?.amountMinor ?? 0;
  return (
    <SectionCard title="Top merchants" subtitle={`Where your money went in ${monthName}`}>
      {merchants.length === 0 ? (
        <p className="text-body text-foreground-secondary">No spending recorded in {monthName}.</p>
      ) : (
        <ol className="flex flex-col gap-4">
          {merchants.map((merchant) => (
            <li key={merchant.merchant} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-3 text-body">
                <span className="truncate text-foreground">{merchant.merchant}</span>
                <span className="font-semibold text-heading">{formatMoney(merchant.amountMinor)}</span>
              </div>
              {/* The bar only repeats the amount shown as text */}
              <div aria-hidden="true" className="h-1.5 rounded-full bg-accent">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.max(2, (merchant.amountMinor / top) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </SectionCard>
  );
}
