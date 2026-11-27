/**
 * The one entry point for categorising transactions: rows and the user's
 * merchant rules in, a category decision per row out. No database.
 *
 * Order (first match wins, locked in the B9 brief):
 *   1. the user's own merchant rule (source USER) → categorisedBy "USER"
 *   2. a built-in keyword rule                    → categorisedBy "RULE"
 *   3. a remembered AI answer (source AI)          → categorisedBy "AI"
 *   4. live AI, one request for all the rest       → categorisedBy "AI"
 *   5. nothing                                     → null: "needs review"
 *
 * A later step never overrides an earlier one: AI never changes a USER or
 * RULE decision. Rules match on merchant key AND direction, because the same
 * merchant can need two categories (Amazon purchases vs Amazon refunds).
 */

import { aiCategorise, aiKey, type MerchantInput } from "./ai";
import { deriveMerchant, merchantKey } from "./merchant";
import { matchBuiltInRule } from "./rules";

export type CategorisableRow = {
  description: string;
  amountMinor: number;
};

/** Matches the Prisma `Direction` enum. */
export type RuleDirection = "IN" | "OUT";

/** A saved merchant rule, as loaded from the database. */
export type SavedMerchantRule = {
  merchantKey: string;
  direction: RuleDirection;
  categoryId: string;
  source: "USER" | "AI";
  lowConfidence: boolean;
};

export type CategorisedBy = "USER" | "RULE" | "AI";

export type CategoryDecision = {
  merchant: string;
  /** `null` means "needs review": nothing applied, and we don't guess. */
  categoryId: string | null;
  categorisedBy: CategorisedBy | null;
  /** A low-confidence AI guess: kept, but shown as "AI guess, check". */
  lowConfidence: boolean;
};

/** A fresh AI answer the caller should save, so it isn't asked again. */
export type NewAiRule = {
  merchantKey: string;
  direction: RuleDirection;
  categoryId: string;
  lowConfidence: boolean;
};

export type CategoriseResult = {
  decisions: CategoryDecision[];
  newAiRules: NewAiRule[];
};

export type CategoriseOptions = {
  /** `false` turns live AI off (rules and remembered answers still apply). */
  ai?: false | typeof aiCategorise;
};

export function directionOf(amountMinor: number): RuleDirection {
  return amountMinor < 0 ? "OUT" : "IN";
}

function ruleKey(key: string, direction: RuleDirection): string {
  return `${key}|${direction}`;
}

export async function categoriseRows(
  rows: readonly CategorisableRow[],
  savedRules: readonly SavedMerchantRule[],
  options: CategoriseOptions = {},
): Promise<CategoriseResult> {
  const userRules = new Map<string, SavedMerchantRule>();
  const aiRules = new Map<string, SavedMerchantRule>();
  for (const rule of savedRules) {
    const target = rule.source === "USER" ? userRules : aiRules;
    target.set(ruleKey(rule.merchantKey, rule.direction), rule);
  }

  // Rows still undecided after steps 1–3, waiting for live AI
  const waiting: { index: number; key: string; direction: RuleDirection }[] = [];

  const decisions = rows.map((row, index): CategoryDecision => {
    const merchant = deriveMerchant(row.description);
    const key = merchantKey(merchant);
    const direction = directionOf(row.amountMinor);
    const lookup = ruleKey(key, direction);

    // 1. The user's own rule for this merchant and direction
    const userRule = userRules.get(lookup);
    if (userRule) {
      return { merchant, categoryId: userRule.categoryId, categorisedBy: "USER", lowConfidence: false };
    }

    // 2. Built-in keyword rules (sign-aware)
    const builtIn = matchBuiltInRule(row.description, row.amountMinor);
    if (builtIn) {
      return { merchant, categoryId: builtIn, categorisedBy: "RULE", lowConfidence: false };
    }

    // 3. A remembered AI answer: no request needed
    const aiRule = aiRules.get(lookup);
    if (aiRule) {
      return {
        merchant,
        categoryId: aiRule.categoryId,
        categorisedBy: "AI",
        lowConfidence: aiRule.lowConfidence,
      };
    }

    // 4. Live AI, below. A row with no merchant is never sent.
    if (key !== "") waiting.push({ index, key, direction });

    // 5. Needs review (unless the AI fills it in below)
    return { merchant, categoryId: null, categorisedBy: null, lowConfidence: false };
  });

  const ai = options.ai ?? aiCategorise;
  if (ai === false || waiting.length === 0) return { decisions, newAiRules: [] };

  // 4. One call for all remaining merchants, each merchant + direction once.
  //    Only the cleaned name, its key and the direction leave the app.
  const items: MerchantInput[] = [];
  const seen = new Set<string>();
  for (const { index, key, direction } of waiting) {
    const lookup = ruleKey(key, direction);
    if (seen.has(lookup)) continue;
    seen.add(lookup);
    items.push({
      merchantKey: key,
      merchant: decisions[index].merchant,
      direction: direction === "OUT" ? "out" : "in",
    });
  }

  const answers = await ai(items);

  for (const { index, key, direction } of waiting) {
    const answer = answers.get(aiKey(key, direction === "OUT" ? "out" : "in"));
    if (!answer) continue; // the AI couldn't place it: stays "needs review"
    decisions[index] = {
      ...decisions[index],
      categoryId: answer.categoryId,
      categorisedBy: "AI",
      lowConfidence: answer.confidence === "low",
    };
  }

  // Remember each new answer once, so this merchant is never sent again
  const newAiRules: NewAiRule[] = [];
  for (const item of items) {
    const answer = answers.get(aiKey(item.merchantKey, item.direction));
    if (!answer) continue;
    newAiRules.push({
      merchantKey: item.merchantKey,
      direction: item.direction === "out" ? "OUT" : "IN",
      categoryId: answer.categoryId,
      lowConfidence: answer.confidence === "low",
    });
  }

  return { decisions, newAiRules };
}
