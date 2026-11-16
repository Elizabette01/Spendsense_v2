import Link from "next/link";

import { monthStart } from "@/lib/finance/months";
import { formatMoney } from "@/lib/format";

import type { BreakdownSlice, MonthBars } from "../build";
import {
  EXPENSES_CLASS,
  INCOME_CLASS,
  IncomeExpensesChart,
} from "./income-expenses-chart";
import { SectionCard, TableView } from "./section-card";
import { SpendingDonut } from "./spending-donut";

const SHORT_MONTH = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });
const LONG_MONTH = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

/** Whole pounds for the donut centre and legend: "£2,150". */
function wholePounds(minor: number): string {
  return `£${Math.round(minor / 100).toLocaleString("en-GB")}`;
}

export function IncomeExpensesSection({ months }: { months: MonthBars[] }) {
  const points = months.map((month) => ({
    label: SHORT_MONTH.format(monthStart(month.key)),
    incomeMinor: month.incomeMinor,
    expensesMinor: month.expensesMinor,
  }));
  const first = LONG_MONTH.format(monthStart(months[0].key));
  const last = LONG_MONTH.format(monthStart(months[months.length - 1].key));

  return (
    <SectionCard title="Income vs expenses" subtitle={`${first} to ${last}`} className="lg:col-span-2">
      <IncomeExpensesChart data={points} />
      <ul className="flex flex-wrap gap-4 text-label text-foreground-secondary" aria-label="Legend">
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className={`size-2.5 rounded-sm bg-current ${INCOME_CLASS}`} />
          Income
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className={`size-2.5 rounded-sm bg-current ${EXPENSES_CLASS}`} />
          Expenses
        </li>
      </ul>
      <TableView caption="Income and expenses by month">
        <thead>
          <tr className="text-foreground-muted">
            <th scope="col" className="py-1 pr-4 font-normal">Month</th>
            <th scope="col" className="py-1 pr-4 text-right font-normal">Income</th>
            <th scope="col" className="py-1 text-right font-normal">Expenses</th>
          </tr>
        </thead>
        <tbody>
          {months.map((month) => (
            <tr key={month.key} className="border-t border-divider text-foreground">
              <th scope="row" className="py-1 pr-4 font-normal">{LONG_MONTH.format(monthStart(month.key))}</th>
              <td className="py-1 pr-4 text-right">{formatMoney(month.incomeMinor)}</td>
              <td className="py-1 text-right">{formatMoney(month.expensesMinor)}</td>
            </tr>
          ))}
        </tbody>
      </TableView>
    </SectionCard>
  );
}

/*
 * Slice colours. The top four are ranked largest first, so they're a one-hue
 * ramp (darker = bigger in light mode, lighter = bigger in dark mode), checked
 * with the dataviz validator. "Other" is grey and "Needs review" is coral, so
 * neither reads as a category. Every slice is also named, valued and listed in
 * the legend and table: colour is never the only way to tell them apart.
 */
const RAMP = [
  "text-brand-800 dark:text-brand-200",
  "text-brand-600 dark:text-brand-300",
  "text-brand-400 dark:text-brand-400",
  "text-brand-300 dark:text-brand-500",
];

function sliceClass(slice: BreakdownSlice, index: number): string {
  if (slice.kind === "other") return "text-foreground-subtle";
  if (slice.kind === "review") return "text-coral";
  return RAMP[index] ?? RAMP[RAMP.length - 1];
}

export function SpendingBreakdownSection({
  monthName,
  totalMinor,
  slices,
}: {
  monthName: string;
  totalMinor: number;
  slices: BreakdownSlice[];
}) {
  if (slices.length === 0) {
    return (
      <SectionCard title="Spending breakdown" subtitle={monthName}>
        <p className="text-body text-foreground-secondary">No spending recorded in {monthName}.</p>
      </SectionCard>
    );
  }

  const coloured = slices.map((slice, index) => ({ ...slice, colorClass: sliceClass(slice, index) }));

  return (
    <SectionCard title="Spending breakdown" subtitle={monthName}>
      <SpendingDonut slices={coloured} totalLabel={wholePounds(totalMinor)} />
      <p className="sr-only">Total spending in {monthName}: {formatMoney(totalMinor)}.</p>
      <ul className="flex flex-col gap-2" aria-label={`Spending by category, ${monthName}`}>
        {coloured.map((slice) => (
          <li key={slice.id} className="flex items-center justify-between gap-3 text-body">
            <span className="flex items-center gap-2 text-foreground">
              <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-sm bg-current ${slice.colorClass}`} />
              {slice.kind === "review" ? (
                <Link
                  href="/transactions?review=1"
                  className="text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-primary"
                >
                  Needs review
                </Link>
              ) : (
                slice.name
              )}
            </span>
            <span className="font-semibold text-heading">{wholePounds(slice.amountMinor)}</span>
          </li>
        ))}
      </ul>
      <TableView caption={`Spending by category, ${monthName}`}>
        <thead>
          <tr className="text-foreground-muted">
            <th scope="col" className="py-1 pr-4 font-normal">Category</th>
            <th scope="col" className="py-1 pr-4 text-right font-normal">Amount</th>
            <th scope="col" className="py-1 text-right font-normal">Share</th>
          </tr>
        </thead>
        <tbody>
          {slices.map((slice) => (
            <tr key={slice.id} className="border-t border-divider text-foreground">
              <th scope="row" className="py-1 pr-4 font-normal">{slice.name}</th>
              <td className="py-1 pr-4 text-right">{formatMoney(slice.amountMinor)}</td>
              <td className="py-1 text-right">{Math.round((slice.amountMinor / totalMinor) * 100)}%</td>
            </tr>
          ))}
        </tbody>
      </TableView>
    </SectionCard>
  );
}
