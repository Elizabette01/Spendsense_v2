import { describe, expect, it } from "vitest";

import { categoriseRows } from "./categorise";

describe("categoriseRows", () => {
  it("uses the user's rule first, then built-in rules, else needs review", () => {
    const result = categoriseRows(
      [
        { description: "TESCO STORES 4521 LONDON GB", amountMinor: -1250 },
        { description: "SAINSBURYS S/MKTS", amountMinor: -900 },
        { description: "TRANSFER FROM J DOE", amountMinor: 5000 },
      ],
      [{ merchantKey: "tesco stores", categoryId: "cat_my_food" }],
    );

    expect(result).toEqual([
      { merchant: "Tesco Stores", categoryId: "cat_my_food", categorisedBy: "USER" },
      { merchant: "Sainsburys S/Mkts", categoryId: "sys_groceries", categorisedBy: "RULE" },
      { merchant: "Transfer From J Doe", categoryId: null, categorisedBy: null },
    ]);
  });

  it("lets a user rule beat a built-in rule for the same merchant", () => {
    const [row] = categoriseRows(
      [{ description: "PRET A MANGER", amountMinor: -450 }],
      [{ merchantKey: "pret a manger", categoryId: "sys_expenses" }],
    );
    expect(row).toMatchObject({ categoryId: "sys_expenses", categorisedBy: "USER" });
  });

  it("applies a user rule whatever the sign", () => {
    const [refund] = categoriseRows(
      [{ description: "TESCO STORES 4521", amountMinor: 1250 }],
      [{ merchantKey: "tesco stores", categoryId: "sys_groceries" }],
    );
    expect(refund).toMatchObject({ categoryId: "sys_groceries", categorisedBy: "USER" });
  });

  it("matches user rules by merchant key, not the raw description", () => {
    const result = categoriseRows(
      [
        { description: "TESCO STORES 4521 LONDON GB", amountMinor: -100 },
        { description: "Tesco Stores 9981 Leeds", amountMinor: -200 },
      ],
      [{ merchantKey: "tesco stores", categoryId: "cat_my_food" }],
    );
    expect(result.map((row) => row.categoryId)).toEqual(["cat_my_food", "cat_my_food"]);
  });

  it("never falls back to General", () => {
    const [row] = categoriseRows([{ description: "XYZ123 UNKNOWN", amountMinor: -100 }], []);
    expect(row.categoryId).toBeNull();
    expect(row.categorisedBy).toBeNull();
  });

  it("keeps one decision per row, in order", () => {
    const rows = Array.from({ length: 5 }, (_, i) => ({
      description: i % 2 ? "NETFLIX.COM" : "MYSTERY",
      amountMinor: -100,
    }));
    const result = categoriseRows(rows, []);
    expect(result.map((row) => row.categorisedBy)).toEqual([null, "RULE", null, "RULE", null]);
  });

  it("does nothing with no rows", () => {
    expect(categoriseRows([], [])).toEqual([]);
  });
});
