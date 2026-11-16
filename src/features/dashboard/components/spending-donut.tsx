"use client";

import { Pie, PieChart, Sector, Tooltip } from "recharts";

import { formatMoney } from "@/lib/format";

export type DonutSlice = { id: string; name: string; amountMinor: number; colorClass: string };

/**
 * Donut of this month's spending with the total in the middle.
 * Decorative for screen readers: the legend beside it and the table view
 * carry every name and amount.
 */
export function SpendingDonut({ slices, totalLabel }: { slices: DonutSlice[]; totalLabel: string }) {
  return (
    <div aria-hidden="true" className="relative mx-auto size-44">
      <PieChart responsive style={{ width: "100%", height: "100%" }}>
        <Pie
          data={slices}
          dataKey="amountMinor"
          nameKey="name"
          innerRadius="68%"
          outerRadius="100%"
          startAngle={90}
          endAngle={-270}
          isAnimationActive={false}
          // A 2px gap in the card colour between slices
          shape={(props) => (
            <Sector
              {...props}
              fill="currentColor"
              strokeWidth={2}
              className={`stroke-card ${slices[props.index]?.colorClass ?? ""}`}
            />
          )}
        />
        <Tooltip
          content={({ active, payload }) =>
            active && payload?.length ? (
              <div className="rounded-control border border-border bg-card px-3 py-2 text-label text-foreground shadow-card">
                {payload[0].name}: {formatMoney(Number(payload[0].value))}
              </div>
            ) : null
          }
        />
      </PieChart>
      <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-card-title text-heading">
        {totalLabel}
      </p>
    </div>
  );
}
