import { describe, expect, it } from "vitest";
import { extractRows } from "./extract";

describe("extractRows", () => {
  it("reads each line below the header into a row", () => {
    const { rows, ignoredLines } = extractRows(
      [
        ["Date", "Description", "Amount", "Balance"],
        ["15/01/2026", "CORNER SHOP", "-4.50", "95.50"],
        ["16/01/2026", "SALARY", "1,500.00", "1,595.50"],
      ],
      {
        headerRowIndex: 0,
        mapping: { date: 0, description: 1, amount: 2, balance: 3 },
        dateOrder: "dmy",
      },
    );

    expect(ignoredLines).toBe(0);
    expect(rows).toEqual([
      {
        rowNumber: 2,
        date: "2026-01-15",
        amountMinor: -450,
        moneyInMinor: null,
        moneyOutMinor: null,
        description: "CORNER SHOP",
        externalId: null,
        balanceMinor: 9550,
      },
      {
        rowNumber: 3,
        date: "2026-01-16",
        amountMinor: 150000,
        moneyInMinor: null,
        moneyOutMinor: null,
        description: "SALARY",
        externalId: null,
        balanceMinor: 159550,
      },
    ]);
  });

  it("keeps money in and money out separate", () => {
    const { rows } = extractRows(
      [
        ["15/01/2026", "CORNER SHOP", "4.50", ""],
        ["16/01/2026", "SALARY", "", "1500.00"],
      ],
      {
        headerRowIndex: -1,
        mapping: { date: 0, description: 1, moneyOut: 2, moneyIn: 3 },
        dateOrder: "dmy",
      },
    );

    expect(rows.map((r) => [r.moneyOutMinor, r.moneyInMinor])).toEqual([
      [450, null],
      [null, 150000],
    ]);
    expect(rows[0].rowNumber).toBe(1);
  });

  it("uses the fallback columns when the description is empty", () => {
    const { rows } = extractRows(
      [
        ["Name", "Description", "Type", "Amount"],
        ["Corner Shop", "CORNER SHOP LONDON", "Card payment", "-4.50"],
        ["", "", "Pot transfer", "-20.00"],
      ],
      {
        headerRowIndex: 0,
        mapping: { description: 0, amount: 3 },
        dateOrder: "dmy",
        descriptionFallbacks: [1, 2],
      },
    );

    expect(rows.map((r) => r.description)).toEqual([
      "Corner Shop",
      "Pot transfer",
    ]);
  });

  it("ignores lines with no date and no amount", () => {
    const { rows, ignoredLines } = extractRows(
      [
        ["Date", "Description", "Amount"],
        ["15/01/2026", "CORNER SHOP", "-4.50"],
        ["Date", "Description", "Amount"],
        ["End of statement", "", ""],
      ],
      {
        headerRowIndex: 0,
        mapping: { date: 0, description: 1, amount: 2 },
        dateOrder: "dmy",
      },
    );

    expect(rows).toHaveLength(1);
    expect(ignoredLines).toBe(2);
  });

  it("keeps a row it can't fully read, so it can be reported", () => {
    const { rows } = extractRows(
      [
        ["31/02/2026", "BAD DATE", "-4.50"],
        ["15/01/2026", "BAD AMOUNT", "four pounds"],
        ["Total", "", "-500.00"],
      ],
      {
        headerRowIndex: -1,
        mapping: { date: 0, description: 1, amount: 2 },
        dateOrder: "dmy",
      },
    );

    expect(rows.map((r) => [r.date, r.amountMinor])).toEqual([
      [null, -450],
      ["2026-01-15", null],
      [null, -50000],
    ]);
  });

  it("drops all of a row's money when one amount can't be read", () => {
    const { rows } = extractRows([["15/01/2026", "SHOP", "4.50", "abc"]], {
      headerRowIndex: -1,
      mapping: { date: 0, description: 1, moneyOut: 2, moneyIn: 3 },
      dateOrder: "dmy",
    });

    expect(rows[0].moneyOutMinor).toBeNull();
    expect(rows[0].moneyInMinor).toBeNull();
  });

  it("reads the bank's own ID", () => {
    const { rows } = extractRows([["tx_001", "15/01/2026", "-4.50"]], {
      headerRowIndex: -1,
      mapping: { externalId: 0, date: 1, amount: 2 },
      dateOrder: "dmy",
    });

    expect(rows[0].externalId).toBe("tx_001");
  });
});