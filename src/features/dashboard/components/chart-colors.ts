/*
 * Chart colours: Tailwind classes on the chart tokens in globals.css
 * (--chart-*), applied with `currentColor`. Each token has its own light and
 * dark value, checked with the dataviz palette validator; see globals.css.
 * A plain module (not "use client"), so server components (legends) and
 * client components (charts) can both import it.
 */
export const INCOME_CLASS = "text-chart-income";
export const EXPENSES_CLASS = "text-chart-expenses";

/** Breakdown slices, biggest category first. */
export const RANK_CLASSES = [
  "text-chart-rank-1",
  "text-chart-rank-2",
  "text-chart-rank-3",
  "text-chart-rank-4",
] as const;
export const OTHER_CLASS = "text-chart-other";
export const REVIEW_CLASS = "text-chart-review";

/** Round axis steps (1, 2, 2.5 or 5 × a power of ten), from 0 up past `max`. */
export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0];
  const rough = max / count;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= rough) ?? 10 * power;
  const ticks: number[] = [];
  for (let value = 0; value < max + step; value += step) ticks.push(value);
  return ticks;
}
