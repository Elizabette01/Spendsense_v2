/*
 * Chart colours as Tailwind classes on design tokens, applied with `currentColor`
 * so dark mode can choose its own step. A plain module (not "use client"), so
 * both server components (legends) and client components (charts) can import it.
 *
 * Checked with the dataviz palette validator:
 *   light: brand-600 + coral on the white card: pass (with legend and bar gap)
 *   dark:  brand-400 + coral-strong on the dark card: pass; coral-strong is just
 *          under 3:1, so the visible table view is required, not optional.
 */
export const INCOME_CLASS = "text-brand-600 dark:text-brand-400";
export const EXPENSES_CLASS = "text-coral dark:text-coral-strong";

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
