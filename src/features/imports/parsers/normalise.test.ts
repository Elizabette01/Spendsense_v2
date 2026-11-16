import { describe, expect, it } from "vitest";
import { cleanDescription, combineAmount, normaliseRows } from "./normalise";
import type { ParsedRow } from "./types";

function row(overrides: Partial<ParsedRow> = {}): ParsedRow {
  return {
    rowNumber: 1,
    date: "2026-01-15",
    amountMinor: null,
    moneyInMinor: null,
    moneyOutMinor: null,
    description: "Corner Shop",
    externalId: null,
    ...overrides,
  };
}

describe("combineAmount", () => {
  it("uses a single signed amount as it is", () => {
    expect(combineAmount(row({ amountMinor: -1200 }))).toEqual({
      ok: true,
      amountMinor: -1200,
    });
  });

  it("makes money out negative, whichever sign the bank used", () => {
    expect(combineAmount(row({ moneyOutMinor: -1200 }))).toEqual({
      ok: true,
      amountMinor: -1200,
    });
    expect(combineAmount(row({ moneyOutMinor: 1200 }))).toEqual({
      ok: true,
      amountMinor: -1200,
    });
  });

  it("makes money in positive", () => {
    expect(combineAmount(row({ moneyInMinor: 5000 }))).toEqual({
      ok: true,
      amountMinor: 5000,
    });
  });

  it("accepts a matching amount column as a cross-check", () => {
    expect(
      combineAmount(row({ amountMinor: -1200, moneyOutMinor: -1200 })),
    ).toEqual({ ok: true, amountMinor: -1200 });
  });

  it("reports a row where the amount disagrees with money in and out", () => {
    expect(
      combineAmount(row({ amountMinor: -1200, moneyOutMinor: -1300 })),
    ).toEqual({ ok: false, reason: "amount_mismatch" });
  });

  it("reports a row with both money in and money out", () => {
    expect(
      combineAmount(row({ moneyInMinor: 500, moneyOutMinor: 700 })),
    ).toEqual({ ok: false, reason: "both_in_and_out" });
  });

  it("reports a row with no amount at all", () => {
    expect(combineAmount(row())).toEqual({
      ok: false,
      reason: "missing_amount",
    });
  });
});

describe("cleanDescription", () => {
  it("collapses tabs and repeated spaces", () => {
    expect(cleanDescription("  TESCO\tSTORES   1234 \n LONDON ")).toBe(
      "TESCO STORES 1234 LONDON",
    );
  });

  it("gives a placeholder when there is no text", () => {
    expect(cleanDescription("   ")).toBe("(no description)");
  });
});

describe("normaliseRows", () => {
  it("keeps rows with a cost and skips zero-amount rows", () => {
    const result = normaliseRows([
      row({ rowNumber: 1, moneyOutMinor: -1200 }),
      row({ rowNumber: 2, amountMinor: 0, moneyOutMinor: 0 }),
      row({ rowNumber: 3, moneyInMinor: 5000 }),
    ]);

    expect(result.rows.map((r) => r.amountMinor)).toEqual([-1200, 5000]);
    expect(result.skippedZero).toBe(1);
    expect(result.issues).toEqual([]);
  });

  it("keeps two identical rows: they are separate transactions", () => {
    const result = normaliseRows([
      row({ rowNumber: 1, amountMinor: -175 }),
      row({ rowNumber: 2, amountMinor: -175 }),
    ]);

    expect(result.rows).toHaveLength(2);
  });

  it("reports rows it can't use instead of guessing", () => {
    const result = normaliseRows([
      row({ rowNumber: 1, date: null, amountMinor: -100 }),
      row({ rowNumber: 2 }),
    ]);

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      { rowNumber: 1, reason: "missing_date" },
      { rowNumber: 2, reason: "missing_amount" },
    ]);
  });
});