import { describe, expect, it } from "vitest";
import { detectColumns, detectDateOrder, findHeaderRow } from "./columns";

describe("detectColumns with known header names", () => {
  it("matches a Monzo-style header", () => {
    const result = detectColumns([
      ["Transaction ID", "Date", "Time", "Type", "Name", "Emoji", "Category", "Amount", "Currency", "Local amount", "Local currency", "Notes and #tags", "Address", "Receipt", "Description", "Category split", "Money Out", "Money In"],
      ["tx_001", "15/01/2026", "09:00:00", "Card payment", "Corner Shop", "", "Groceries", "-4.50", "GBP", "-4.50", "GBP", "", "", "", "CORNER SHOP LONDON", "", "-4.50", ""],
    ]);

    expect(result.headerRowIndex).toBe(0);
    expect(result.mapping).toEqual({
      externalId: 0,
      date: 1,
      amount: 7,
      description: 14,
      moneyOut: 16,
      moneyIn: 17,
    });
    expect(result.uncertain).toEqual([]);
  });

  it("matches a Lloyds-style header with two money columns", () => {
    const result = detectColumns([
      ["Transaction Date", "Transaction Type", "Sort Code", "Account Number", "Transaction Description", "Debit Amount", "Credit Amount", "Balance"],
      ["15/01/2026", "DEB", "'00-00-00", "00000000", "CORNER SHOP", "4.50", "", "95.50"],
    ]);

    expect(result.mapping).toEqual({
      date: 0,
      description: 4,
      moneyOut: 5,
      moneyIn: 6,
      balance: 7,
    });
  });

  it("matches a NatWest-style header", () => {
    const result = detectColumns([
      ["Date", "Type", "Description", "Value", "Balance", "Account Name", "Account Number"],
      ["15/01/2026", "POS", "CORNER SHOP", "-4.50", "95.50", "CURRENT", "00000000"],
    ]);

    expect(result.mapping).toEqual({
      date: 0,
      description: 2,
      amount: 3,
      balance: 4,
    });
  });

  it("matches a Barclays-style header, using Memo as the description", () => {
    const result = detectColumns([
      ["Number", "Date", "Account", "Amount", "Subcategory", "Memo"],
      ["0", "15/01/2026", "00-00-00 00000000", "-4.50", "Card Purchase", "CORNER SHOP"],
    ]);

    expect(result.mapping).toEqual({ date: 1, amount: 3, description: 5 });
  });

  it("skips lines above the header", () => {
    const result = detectColumns([
      ["Account name", "Example account"],
      ["Exported", "today"],
      ["Date", "Description", "Amount"],
      ["15/01/2026", "CORNER SHOP", "-4.50"],
    ]);

    expect(result.headerRowIndex).toBe(2);
    expect(result.mapping).toEqual({ date: 0, description: 1, amount: 2 });
  });
});

describe("detectColumns from cell contents", () => {
  it("works out a file with no header row", () => {
    const result = detectColumns([
      ["15/01/2026", "CORNER SHOP", "-4.50"],
      ["16/01/2026", "BUS FARE", "-1.75"],
      ["17/01/2026", "SALARY", "1500.00"],
    ]);

    expect(result.headerRowIndex).toBe(-1);
    expect(result.headers).toEqual(["Column 1", "Column 2", "Column 3"]);
    expect(result.mapping).toEqual({ date: 0, amount: 2, description: 1 });
    expect(result.uncertain).toEqual(["date", "amount", "description"]);
  });

  it("works out a file whose header names it doesn't know", () => {
    const result = detectColumns([
      ["When", "What", "How much"],
      ["15/01/2026", "CORNER SHOP", "-4.50"],
      ["16/01/2026", "BUS FARE", "-1.75"],
    ]);

    expect(result.headerRowIndex).toBe(0);
    expect(result.headers).toEqual(["When", "What", "How much"]);
    expect(result.mapping).toEqual({ date: 0, amount: 2, description: 1 });
  });

  it("spots a money out and money in pair", () => {
    const result = detectColumns([
      ["15/01/2026", "CORNER SHOP", "4.50", ""],
      ["16/01/2026", "BUS FARE", "1.75", ""],
      ["17/01/2026", "SALARY", "", "1500.00"],
    ]);

    expect(result.mapping).toEqual({
      date: 0,
      moneyOut: 2,
      moneyIn: 3,
      description: 1,
    });
  });

  it("doesn't mistake an account number for an amount", () => {
    const result = detectColumns([
      ["15/01/2026", "CORNER SHOP", "00012345", "-4.50"],
      ["16/01/2026", "BUS FARE", "00012345", "-1.75"],
    ]);

    expect(result.mapping.amount).toBe(3);
    expect(result.mapping.description).toBe(1);
  });
});

describe("findHeaderRow", () => {
  it("returns -1 for an empty grid", () => {
    expect(findHeaderRow([])).toBe(-1);
  });
});

describe("detectDateOrder", () => {
  it("is certain of day-first when a first number is above 12", () => {
    expect(detectDateOrder(["01/02/2026", "25/02/2026"])).toEqual({
      order: "dmy",
      certain: true,
      conflicting: false,
    });
  });

  it("is certain of month-first when a second number is above 12", () => {
    expect(detectDateOrder(["01/02/2026", "02/25/2026"])).toEqual({
      order: "mdy",
      certain: true,
      conflicting: false,
    });
  });

  it("defaults to day-first, uncertain, when nothing settles it", () => {
    expect(detectDateOrder(["01/02/2026", "03/04/2026"])).toEqual({
      order: "dmy",
      certain: false,
      conflicting: false,
    });
  });

  it("reports a column that contains both kinds", () => {
    expect(detectDateOrder(["25/02/2026", "02/25/2026"]).conflicting).toBe(true);
  });

  it("is used by detectColumns", () => {
    const result = detectColumns([
      ["Date", "Description", "Amount"],
      ["25/01/2026", "CORNER SHOP", "-4.50"],
    ]);

    expect(result.dateOrder).toBe("dmy");
    expect(result.dateOrderCertain).toBe(true);
  });
});