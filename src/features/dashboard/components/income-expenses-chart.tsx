"use client";

import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";

import { formatMoney } from "@/lib/format";

export type IncomeExpensesPoint = { label: string; incomeMinor: number; expensesMinor: number };

/*
 * Colours are design tokens, applied with `currentColor` so dark mode can
 * choose its own step. Checked with the dataviz palette validator:
 *   light: brand-600 + coral on the white card: pass (with legend and bar gap)
 *   dark:  brand-400 + coral-strong on the dark card: pass; coral-strong is just
 *          under 3:1, so the visible table view below is required, not optional.
 */
export const INCOME_CLASS = "text-brand-600 dark:text-brand-400";
export const EXPENSES_CLASS = "text-coral dark:text-coral-strong";

function axisPounds(minor: number): string {
  const pounds = minor / 100;
  return pounds >= 1000 ? `£${Math.round(pounds / 1000)}k` : `£${Math.round(pounds)}`;
}

/** Grouped bars: income and expenses for each of the last six months. */
export function IncomeExpensesChart({ data }: { data: IncomeExpensesPoint[] }) {
  return (
    <div aria-hidden="true" className="h-60 w-full text-foreground-muted">
      <BarChart
        responsive
        style={{ width: "100%", height: "100%" }}
        data={data}
        barGap={2}
        barCategoryGap="28%"
        margin={{ top: 8, right: 0, bottom: 0, left: 0 }}
      >
        <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.15} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "currentColor", fontSize: 12 }}
        />
        <YAxis
          width={44}
          tickLine={false}
          axisLine={false}
          tickFormatter={axisPounds}
          tick={{ fill: "currentColor", fontSize: 11 }}
        />
        <Tooltip
          cursor={{ fill: "currentColor", fillOpacity: 0.06 }}
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <div className="rounded-control border border-border bg-card px-3 py-2 text-label text-foreground shadow-card">
                <p className="font-semibold text-heading">{label}</p>
                {payload.map((item) => (
                  <p key={String(item.dataKey)}>
                    {item.dataKey === "incomeMinor" ? "Income" : "Expenses"}:{" "}
                    {formatMoney(Number(item.value))}
                  </p>
                ))}
              </div>
            ) : null
          }
        />
        <Bar
          dataKey="incomeMinor"
          name="Income"
          fill="currentColor"
          className={INCOME_CLASS}
          radius={[4, 4, 0, 0]}
          maxBarSize={20}
          isAnimationActive={false}
        />
        <Bar
          dataKey="expensesMinor"
          name="Expenses"
          fill="currentColor"
          className={EXPENSES_CLASS}
          radius={[4, 4, 0, 0]}
          maxBarSize={20}
          isAnimationActive={false}
        />
      </BarChart>
    </div>
  );
}
