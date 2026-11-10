/**
 * Plan prices and features: the ONE place to change them.
 * Prices are placeholders until billing (Stripe) is built.
 */
export const CURRENCY_SYMBOL = "£";

export const PRO_PRICE = {
  monthly: 4.99,
  yearly: 49.99,
} as const;

export const PRO_TRIAL_DAYS = 7;

export const FREE_FEATURES = [
  "Statement upload (CSV and PDF)",
  "Automatic categorisation",
  "Dashboard charts",
  "Recurring payment detection",
  "Budgets",
] as const;

export const PRO_FEATURES = ["Everything in Free", "AI money coach chat"] as const;

/** £4.99 → "£4.99" */
export function formatPrice(amount: number) {
  return `${CURRENCY_SYMBOL}${amount.toFixed(2)}`;
}

/** How much a year costs less than 12 months, e.g. "£9.89". */
export function yearlySaving() {
  return formatPrice(PRO_PRICE.monthly * 12 - PRO_PRICE.yearly);
}
