import { describe, expect, it } from "vitest";
import { checkBalance } from "./balance";
import type { ParsedRow } from "./types";

function row(amountMinor: number, balanceMinor: number | null): ParsedRow {
  return {
    rowNumber: 1,
    date: "2026-01-15",
    amountMinor,
    moneyInMinor: null,
    moneyOutMinor: null,
    description: "Shop",
    externalId: null,
    balanceMinor,
  };
}

describe("checkBalance", () => {
  it("confirms a statement listed oldest first", () => {
    expect(
      checkBalance([row(-450, 9550), row(-175, 9375), row(150000, 159375)]),
    ).toEqual({ status: "consistent", newestFirst: false });
  });

  it("confirms a statement listed newest first", () => {
    expect(
      checkBalance([row(150000, 159375), row(-175, 9375), row(-450, 9550)]),
    ).toEqual({ status: "consistent", newestFirst: true });
  });

  it("spots amounts whose sign is the wrong way round", () => {
    expect(
      checkBalance([row(450, 9550), row(175, 9375), row(-150000, 159375)]),
    ).toEqual({ status: "inverted", newestFirst: false });
  });

  it("reports a balance column that doesn't add up", () => {
    expect(
      checkBalance([row(-450, 9550), row(-175, 1000), row(150000, 5)]),
    ).toEqual({ status: "inconsistent" });
  });

  it("says nothing when there is no balance column", () => {
    expect(checkBalance([row(-450, null), row(-175, null)])).toEqual({
      status: "none",
    });
  });

  it("needs at least two pairs of rows to judge", () => {
    expect(checkBalance([row(-450, 9550), row(-175, 9375)])).toEqual({
      status: "none",
    });
  });
});