import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
// Safety net: even if a test forgot its fake, there is no key, so no request
vi.mock("../ai/client", () => ({ getAnthropic: () => null }));

import type { Checked, MerchantInput } from "./ai";
import { categoriseRows, type SavedMerchantRule } from "./categorise";

const NO_AI = { ai: false } as const;

function userRule(
  merchantKey: string,
  categoryId: string,
  direction: "IN" | "OUT" = "OUT",
): SavedMerchantRule {
  return { merchantKey, direction, categoryId, source: "USER", lowConfidence: false };
}

function aiRule(
  merchantKey: string,
  categoryId: string,
  lowConfidence = false,
  direction: "IN" | "OUT" = "OUT",
): SavedMerchantRule {
  return { merchantKey, direction, categoryId, source: "AI", lowConfidence };
}

/** A fake AI that answers from a table and records what it was sent. */
function fakeAi(table: Record<string, Checked>) {
  const calls: MerchantInput[][] = [];
  const ai = vi.fn(async (items: readonly MerchantInput[]) => {
    calls.push([...items]);
    const map = new Map<string, Checked>();
    for (const item of items) {
      const key = `${item.merchantKey}|${item.direction}`;
      map.set(key, table[key] ?? null);
    }
    return map;
  });
  return { ai, calls };
}

describe("categoriseRows: rules (no AI)", () => {
  it("uses the user's rule first, then built-in rules, else needs review", async () => {
    const { decisions } = await categoriseRows(
      [
        { description: "TESCO STORES 4521 LONDON GB", amountMinor: -1250 },
        { description: "SAINSBURYS S/MKTS", amountMinor: -900 },
        { description: "TRANSFER FROM J DOE", amountMinor: 5000 },
      ],
      [userRule("tesco stores", "cat_my_food")],
      NO_AI,
    );

    expect(decisions).toEqual([
      { merchant: "Tesco Stores", categoryId: "cat_my_food", categorisedBy: "USER", lowConfidence: false },
      { merchant: "Sainsburys S/Mkts", categoryId: "sys_groceries", categorisedBy: "RULE", lowConfidence: false },
      { merchant: "Transfer From J Doe", categoryId: null, categorisedBy: null, lowConfidence: false },
    ]);
  });

  it("lets a user rule beat a built-in rule for the same merchant", async () => {
    const { decisions } = await categoriseRows(
      [{ description: "PRET A MANGER", amountMinor: -450 }],
      [userRule("pret a manger", "sys_expenses")],
      NO_AI,
    );
    expect(decisions[0]).toMatchObject({ categoryId: "sys_expenses", categorisedBy: "USER" });
  });

  it("applies a user rule only to its own direction", async () => {
    const { decisions } = await categoriseRows(
      [
        { description: "TESCO STORES 4521", amountMinor: -1250 },
        { description: "TESCO STORES 4521", amountMinor: 1250 },
      ],
      [userRule("tesco stores", "sys_groceries", "OUT")],
      NO_AI,
    );
    expect(decisions[0]).toMatchObject({ categoryId: "sys_groceries", categorisedBy: "USER" });
    // Money in from Tesco falls through to the built-in refund rule
    expect(decisions[1]).toMatchObject({ categoryId: "sys_refunds", categorisedBy: "RULE" });
  });

  it("matches user rules by merchant key, not the raw description", async () => {
    const { decisions } = await categoriseRows(
      [
        { description: "TESCO STORES 4521 LONDON GB", amountMinor: -100 },
        { description: "Tesco Stores 9981 Leeds", amountMinor: -200 },
      ],
      [userRule("tesco stores", "cat_my_food")],
      NO_AI,
    );
    expect(decisions.map((row) => row.categoryId)).toEqual(["cat_my_food", "cat_my_food"]);
  });

  it("never falls back to General", async () => {
    const { decisions } = await categoriseRows(
      [{ description: "XYZ123 UNKNOWN", amountMinor: -100 }],
      [],
      NO_AI,
    );
    expect(decisions[0].categoryId).toBeNull();
    expect(decisions[0].categorisedBy).toBeNull();
  });

  it("keeps one decision per row, in order", async () => {
    const rows = Array.from({ length: 5 }, (_, i) => ({
      description: i % 2 ? "NETFLIX.COM" : "MYSTERY",
      amountMinor: -100,
    }));
    const { decisions } = await categoriseRows(rows, [], NO_AI);
    expect(decisions.map((row) => row.categorisedBy)).toEqual([null, "RULE", null, "RULE", null]);
  });

  it("does nothing with no rows", async () => {
    expect(await categoriseRows([], [], NO_AI)).toEqual({ decisions: [], newAiRules: [] });
  });
});

describe("categoriseRows: AI", () => {
  it("sends only rows the rules couldn't place, each merchant + direction once", async () => {
    const { ai, calls } = fakeAi({});
    await categoriseRows(
      [
        { description: "TESCO STORES 4521", amountMinor: -100 }, // RULE
        { description: "ZEPHYR CRUMBS 123", amountMinor: -300 },
        { description: "ZEPHYR CRUMBS 998", amountMinor: -400 }, // same merchant
        { description: "J SMITH", amountMinor: -5000 },
        { description: "J SMITH", amountMinor: 2000 }, // same merchant, other direction
        { description: "MY CAFE", amountMinor: -250 }, // user rule
      ],
      [userRule("my cafe", "sys_eating_out")],
      { ai },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual([
      { merchantKey: "zephyr crumbs", merchant: "Zephyr Crumbs", direction: "out" },
      { merchantKey: "j smith", merchant: "J Smith", direction: "out" },
      { merchantKey: "j smith", merchant: "J Smith", direction: "in" },
    ]);
  });

  it("sends only the cleaned name, key and direction: no amounts or descriptions", async () => {
    const { ai, calls } = fakeAi({});
    await categoriseRows(
      [{ description: "CARD PAYMENT TO ZEPHYR CRUMBS 12 ON 03 MAR", amountMinor: -1234 }],
      [],
      { ai },
    );
    const sent = JSON.stringify(calls);
    expect(Object.keys(calls[0][0]).sort()).toEqual(["direction", "merchant", "merchantKey"]);
    expect(sent).not.toContain("1234");
    expect(sent).not.toContain("CARD PAYMENT");
    expect(sent).not.toContain("03 MAR");
  });

  it("fills AI answers, keeps low confidence, and returns new rules to remember", async () => {
    const { ai } = fakeAi({
      "zephyr crumbs|out": { categoryId: "sys_eating_out", confidence: "high" },
      "j smith|out": { categoryId: "sys_people_out", confidence: "low" },
    });
    const result = await categoriseRows(
      [
        { description: "ZEPHYR CRUMBS", amountMinor: -300 },
        { description: "ZEPHYR CRUMBS", amountMinor: -400 },
        { description: "J SMITH", amountMinor: -5000 },
        { description: "ZQX HOLDINGS", amountMinor: -100 },
      ],
      [],
      { ai },
    );

    expect(result.decisions.map((d) => [d.categoryId, d.categorisedBy, d.lowConfidence])).toEqual([
      ["sys_eating_out", "AI", false],
      ["sys_eating_out", "AI", false],
      ["sys_people_out", "AI", true],
      [null, null, false], // "unsure" or missing: needs review
    ]);
    expect(result.newAiRules).toEqual([
      { merchantKey: "zephyr crumbs", direction: "OUT", categoryId: "sys_eating_out", lowConfidence: false },
      { merchantKey: "j smith", direction: "OUT", categoryId: "sys_people_out", lowConfidence: true },
    ]);
  });

  it("uses a remembered AI answer without making a request", async () => {
    const { ai } = fakeAi({});
    const result = await categoriseRows(
      [{ description: "ZEPHYR CRUMBS", amountMinor: -300 }],
      [aiRule("zephyr crumbs", "sys_eating_out", true)],
      { ai },
    );
    expect(ai).not.toHaveBeenCalled();
    expect(result.decisions[0]).toMatchObject({
      categoryId: "sys_eating_out",
      categorisedBy: "AI",
      lowConfidence: true,
    });
    expect(result.newAiRules).toEqual([]);
  });

  it("never lets AI override a USER or RULE decision", async () => {
    const { ai, calls } = fakeAi({
      "tesco stores|out": { categoryId: "sys_shopping", confidence: "high" },
      "my cafe|out": { categoryId: "sys_shopping", confidence: "high" },
    });
    const { decisions } = await categoriseRows(
      [
        { description: "TESCO STORES", amountMinor: -100 },
        { description: "MY CAFE", amountMinor: -100 },
      ],
      [userRule("my cafe", "sys_eating_out"), aiRule("tesco stores", "sys_bills")],
      { ai },
    );
    expect(calls).toHaveLength(0);
    expect(decisions.map((d) => [d.categoryId, d.categorisedBy])).toEqual([
      ["sys_groceries", "RULE"], // built-in beats a remembered AI answer
      ["sys_eating_out", "USER"],
    ]);
  });

  it("lets a USER rule beat a remembered AI answer for the same merchant", async () => {
    const { decisions } = await categoriseRows(
      [{ description: "ZEPHYR CRUMBS", amountMinor: -300 }],
      [aiRule("zephyr crumbs", "sys_shopping"), userRule("zephyr crumbs", "sys_eating_out")],
      NO_AI,
    );
    expect(decisions[0]).toMatchObject({ categoryId: "sys_eating_out", categorisedBy: "USER" });
  });

  it("makes no request when everything is already decided", async () => {
    const { ai } = fakeAi({});
    await categoriseRows([{ description: "NETFLIX.COM", amountMinor: -999 }], [], { ai });
    expect(ai).not.toHaveBeenCalled();
  });

  it("leaves rows as needs review when the AI has no key (the default categoriser)", async () => {
    const { decisions, newAiRules } = await categoriseRows(
      [{ description: "ZEPHYR CRUMBS", amountMinor: -300 }],
      [],
    );
    expect(decisions[0].categoryId).toBeNull();
    expect(newAiRules).toEqual([]);
  });
});
