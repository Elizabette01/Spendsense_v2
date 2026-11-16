/**
 * Display formatting, used at the edge only (money is stored as integer pence,
 * dates as calendar days). Browser-safe: no server imports.
 */

const GBP = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

/** Integer pence → "£1,234.56" (negative → "-£12.50"). */
export function formatMoney(amountMinor: number): string {
  return GBP.format(amountMinor / 100);
}

/** Like formatMoney, but always without a sign: for "money in" / "money out" totals. */
export function formatMoneyAbs(amountMinor: number): string {
  return GBP.format(Math.abs(amountMinor) / 100);
}

const DAY = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const MONTH_YEAR = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const MONTH = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" });

function toDate(value: Date | string): Date {
  // "2026-04-11" is a calendar day: read it as midnight UTC, never local time
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00.000Z`)
    : new Date(value);
}

/** → "11 Apr 2026". Dates are calendar days, so UTC is used throughout. */
export function formatDay(value: Date | string): string {
  return DAY.format(toDate(value));
}

/** → "April 2026". */
export function formatMonthYear(value: Date | string): string {
  return MONTH_YEAR.format(toDate(value));
}

/**
 * The months a statement covers: "April 2026", "May to October 2026",
 * "December 2025 to January 2026", or null when there are no dates.
 */
export function formatPeriod(
  start: Date | string | null,
  end: Date | string | null,
): string | null {
  if (!start || !end) return null;
  const from = toDate(start);
  const to = toDate(end);
  const sameYear = from.getUTCFullYear() === to.getUTCFullYear();
  if (sameYear && from.getUTCMonth() === to.getUTCMonth()) return formatMonthYear(from);
  return sameYear
    ? `${MONTH.format(from)} to ${formatMonthYear(to)}`
    : `${formatMonthYear(from)} to ${formatMonthYear(to)}`;
}

/** "1 transaction" / "142 transactions". */
export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count.toLocaleString("en-GB")} ${count === 1 ? one : many}`;
}
