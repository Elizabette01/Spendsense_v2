/**
 * The one entry point for categorising transactions. Pure: rows and the
 * user's rules in, a category decision per row out. No database.
 *
 * Order (first match wins):
 *   1. the user's own merchant rule   → categorisedBy "USER"
 *   2. a built-in keyword rule        → categorisedBy "RULE"
 *   3. (later) the AI categoriser     → categorisedBy "AI"
 *   4. nothing                        → null: "needs review"
 *
 * A later step never overrides an earlier one: AI must never change a USER
 * or RULE decision.
 */

import { deriveMerchant, merchantKey } from "./merchant";
import { matchBuiltInRule } from "./rules";

export type CategorisableRow = {
  description: string;
  amountMinor: number;
};

export type UserMerchantRule = {
  merchantKey: string;
  categoryId: string;
};

export type CategorisedBy = "USER" | "RULE";

export type CategoryDecision = {
  merchant: string;
  /** `null` means "needs review": no rule applied, and we don't guess. */
  categoryId: string | null;
  categorisedBy: CategorisedBy | null;
};

export function categoriseRows(
  rows: readonly CategorisableRow[],
  userRules: readonly UserMerchantRule[],
): CategoryDecision[] {
  const byMerchant = new Map(
    userRules.map((rule) => [rule.merchantKey, rule.categoryId]),
  );

  const decisions = rows.map((row): CategoryDecision => {
    const merchant = deriveMerchant(row.description);

    // 1. The user's own rule for this merchant
    const userCategory = byMerchant.get(merchantKey(merchant));
    if (userCategory) {
      return { merchant, categoryId: userCategory, categorisedBy: "USER" };
    }

    // 2. Built-in keyword rules (sign-aware)
    const builtIn = matchBuiltInRule(row.description, row.amountMinor);
    if (builtIn) {
      return { merchant, categoryId: builtIn, categorisedBy: "RULE" };
    }

    // 4. Needs review
    return { merchant, categoryId: null, categorisedBy: null };
  });

  // 3. AI GOES HERE (not built yet).
  //    Send only the rows still `categoryId === null` to the AI categoriser and
  //    fill in its answers with `categorisedBy: "AI"`. Never touch rows already
  //    decided by "USER" or "RULE". Rows the AI can't place stay null (needs review).
  //    That step will be async, so this function will become async with it.

  return decisions;
}
