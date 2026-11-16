import { describe, expect, it } from "vitest";
import { analysePdfText, detectBank } from "./pdfStatement";

function amounts(text: string) {
  return analysePdfText(text).normalised.rows.map((r) => [r.date, r.amountMinor, r.description]);
}

describe("detectBank", () => {
  it("finds each of the five banks by name", () => {
    expect(detectBank("Barclays Bank UK PLC")).toBe("barclays");
    expect(detectBank("Lloyds Bank plc")).toBe("lloyds");
    expect(detectBank("HSBC UK Bank plc")).toBe("hsbc");
    expect(detectBank("Monzo Bank Limited")).toBe("monzo");
    expect(detectBank("National Westminster Bank Plc")).toBe("natwest");
    expect(detectBank("Acme Building Society")).toBeNull();
  });
});

describe("analysePdfText", () => {
  it("rejects text that doesn't look like a bank statement", () => {
    const result = analysePdfText("Invoice 123\n15/01/2026 Widgets 4.50");
    expect(result.failure).toBe("not_a_statement");
  });

  it("works out money in and out from the balance column", () => {
    const text = [
      "Lloyds Bank plc",
      "Statement 1 January 2026 to 31 January 2026",
      "Date Description Money out Money in Balance",
      "01 Jan 26 Balance brought forward 100.00",
      "05 Jan 26 CORNER SHOP 4.50 95.50",
      "25 Jan 26 EMPLOYER LTD 1,500.00 1,595.50",
    ].join("\n");

    const result = analysePdfText(text);
    expect(result.bank).toBe("lloyds");
    expect(result.failure).toBeNull();
    expect(amounts(text)).toEqual([
      ["2026-01-05", -450, "CORNER SHOP"],
      ["2026-01-25", 150000, "EMPLOYER LTD"],
    ]);
  });

  it("handles dates without a year and a balance only at the end of each day", () => {
    const text = [
      "Barclays Bank UK PLC",
      "Your statement 1 December 2025 to 31 January 2026",
      "1 Dec Start balance 100.00",
      "5 Dec CORNER SHOP 4.50",
      "BUS FARE 1.75",
      "REFUND FROM SHOP 2.00 95.75",
      "3 Jan EMPLOYER LTD 1,500.00 1,595.75",
    ].join("\n");

    expect(amounts(text)).toEqual([
      ["2025-12-05", -450, "CORNER SHOP"],
      ["2025-12-05", -175, "BUS FARE"],
      ["2025-12-05", 200, "REFUND FROM SHOP"],
      ["2026-01-03", 150000, "EMPLOYER LTD"],
    ]);
  });

  it("handles a statement listed newest first", () => {
    const text = [
      "HSBC UK Bank plc statement",
      "25 Jan 2026 EMPLOYER LTD 1,500.00 1,595.50",
      "05 Jan 2026 CORNER SHOP 4.50 95.50",
      "01 Jan 2026 BALANCE BROUGHT FORWARD 100.00",
    ].join("\n");

    expect(amounts(text)).toEqual([
      ["2026-01-25", 150000, "EMPLOYER LTD"],
      ["2026-01-05", -450, "CORNER SHOP"],
    ]);
  });

  it("trusts amounts that carry their own sign", () => {
    const text = [
      "Monzo Bank Limited",
      "15/01/2026 CORNER SHOP -4.50 95.50",
      "16/01/2026 FROM A FRIEND 10.00 105.50",
    ].join("\n");

    expect(amounts(text)).toEqual([
      ["2026-01-15", -450, "CORNER SHOP"],
      ["2026-01-16", 1000, "FROM A FRIEND"],
    ]);
  });

  it("reads CR and DR markers", () => {
    const text = [
      "NatWest statement",
      "15/01/2026 CORNER SHOP 4.50 DR",
      "16/01/2026 SALARY 1,500.00CR",
    ].join("\n");

    expect(amounts(text)).toEqual([
      ["2026-01-15", -450, "CORNER SHOP"],
      ["2026-01-16", 150000, "SALARY"],
    ]);
  });

  it("takes the description from the line before when the amount line has none", () => {
    const text = [
      "Barclays statement",
      "01 Jan 2026 Start balance 100.00",
      "05 Jan 2026 CARD PAYMENT TO",
      "CORNER SHOP",
      "4.50 95.50",
    ].join("\n");

    expect(amounts(text)).toEqual([["2026-01-05", -450, "CARD PAYMENT TO CORNER SHOP"]]);
  });

  it("never drops a row it can't sign: it reports it instead", () => {
    const text = [
      "Lloyds statement",
      "05 Jan 2026 CORNER SHOP 4.50 95.50",
      "06 Jan 2026 BUS FARE 1.75 93.75",
    ].join("\n");

    const result = analysePdfText(text);
    expect(result.normalised.rows.map((r) => r.amountMinor)).toEqual([-175]);
    expect(result.normalised.issues).toEqual([{ rowNumber: 2, reason: "missing_amount" }]);
  });

  it("ignores reference numbers, headers and summary totals", () => {
    const text = [
      "Lloyds Bank statement",
      "Account number 12345678 Sort code 00-00-00",
      "Date Description Money out Money in Balance",
      "01 Jan 2026 Balance brought forward 100.00",
      "05 Jan 2026 TOTAL FITNESS 30.00 70.00",
      "Total paid out 30.00",
    ].join("\n");

    const result = analysePdfText(text);
    expect(amounts(text)).toEqual([["2026-01-05", -3000, "TOTAL FITNESS"]]);
    expect(result.ignoredLines).toBeGreaterThanOrEqual(3);
  });

  it("reports a statement with no transactions", () => {
    expect(analysePdfText("Monzo statement\nNothing to see").failure).toBe("no_transactions");
  });
});