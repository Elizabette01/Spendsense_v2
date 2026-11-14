import { describe, expect, it } from "vitest";
import { analyseGrid } from "./analyse";
import { findProfile } from "./profiles";
import type { Grid } from "./types";

const MONZO_HEADER = [
  "Transaction ID", "Date", "Time", "Type", "Name", "Emoji", "Category",
  "Amount", "Currency", "Local amount", "Local currency", "Notes and #tags",
  "Address", "Receipt", "Description", "Category split", "Money Out", "Money In",
];

function monzoLine(
  id: string,
  date: string,
  type: string,
  name: string,
  amount: string,
  options: { currency?: string; description?: string } = {},
): string[] {
  const out = amount.startsWith("-") ? amount : "";
  const into = amount.startsWith("-") ? "" : amount;
  return [
    id, date, "09:00:00", type, name, "", "General", amount,
    options.currency ?? "GBP", amount, "GBP", "", "", "",
    options.description ?? "", "", out, into,
  ];
}

describe("findProfile", () => {
  it("recognises each bank by its header", () => {
    expect(findProfile(MONZO_HEADER)?.id).toBe("monzo");
    expect(
      findProfile(["Transaction Date", "Transaction Type", "Sort Code", "Account Number", "Transaction Description", "Debit Amount", "Credit Amount", "Balance", ""])?.id,
    ).toBe("lloyds");
    expect(
      findProfile(["Date", "Type", "Description", "Value", "Balance", "Account Name", "Account Number"])?.id,
    ).toBe("natwest");
    expect(
      findProfile(["Number", "Date", "Account", "Amount", "Subcategory", "Memo"])?.id,
    ).toBe("barclays");
  });

  it("returns null for a header no profile matches", () => {
    expect(findProfile(["Date", "Description", "Amount", "Balance"])).toBeNull();
  });
});

describe("analyseGrid with bank profiles", () => {
  it("reads a Monzo export", () => {
    const result = analyseGrid([
      MONZO_HEADER,
      monzoLine("tx_001", "15/01/2026", "Card payment", "Corner Shop", "-4.50", {
        description: "CORNER SHOP LONDON",
      }),
      monzoLine("tx_002", "16/01/2026", "Pot transfer", "", "-20.00"),
      monzoLine("tx_003", "17/01/2026", "Card payment", "Hp Inc", "0.00"),
      monzoLine("tx_004", "25/01/2026", "Faster payment", "Employer Ltd", "1500.00"),
    ]);

    expect(result.failure).toBeNull();
    expect(result.bank).toEqual({ id: "monzo", name: "Monzo", verified: true });
    expect(result.detection.uncertain).toEqual([]);
    expect(result.normalised.skippedZero).toBe(1);
    expect(
      result.normalised.rows.map((r) => [r.description, r.amountMinor, r.externalId]),
    ).toEqual([
      ["Corner Shop", -450, "tx_001"],
      ["Pot transfer", -2000, "tx_002"],
      ["Employer Ltd", 150000, "tx_004"],
    ]);
  });

  it("rejects a Monzo file in another account currency", () => {
    const result = analyseGrid([
      MONZO_HEADER,
      monzoLine("tx_001", "15/01/2026", "Card payment", "Cafe", "-4.50", {
        currency: "EUR",
      }),
    ]);

    expect(result.failure).toBe("not_gbp");
  });

  it("reads a Lloyds export and confirms its balance", () => {
    const result = analyseGrid([
      ["Transaction Date", "Transaction Type", "Sort Code", "Account Number", "Transaction Description", "Debit Amount", "Credit Amount", "Balance", ""],
      ["15/01/2026", "DEB", "'00-00-00", "00000000", "CORNER SHOP", "4.50", "", "95.50", ""],
      ["16/01/2026", "DEB", "'00-00-00", "00000000", "BUS FARE", "1.75", "", "93.75", ""],
      ["25/01/2026", "FPI", "'00-00-00", "00000000", "EMPLOYER LTD", "", "1500.00", "1593.75", ""],
    ]);

    expect(result.failure).toBeNull();
    expect(result.bank?.name).toBe("Lloyds Banking Group");
    expect(result.normalised.rows.map((r) => r.amountMinor)).toEqual([
      -450, -175, 150000,
    ]);
    expect(result.balance).toEqual({ status: "consistent", newestFirst: false });
  });

  it("reads a NatWest export", () => {
    const result = analyseGrid([
      ["Date", "Type", "Description", "Value", "Balance", "Account Name", "Account Number"],
      ["15/01/2026", "POS", "CORNER SHOP", "-4.50", "95.50", "CURRENT", "00000000"],
      ["16/01/2026", "POS", "BUS FARE", "-1.75", "93.75", "CURRENT", "00000000"],
      ["25/01/2026", "BAC", "EMPLOYER LTD", "1500.00", "1593.75", "CURRENT", "00000000"],
    ]);

    expect(result.failure).toBeNull();
    expect(result.bank?.id).toBe("natwest");
    expect(result.balance.status).toBe("consistent");
  });

  it("puts a Barclays memo back together after an unquoted comma", () => {
    const result = analyseGrid([
      ["Number", "Date", "Account", "Amount", "Subcategory", "Memo"],
      ["0", "15/01/2026", "00-00-00 00000000", "-4.50", "Card Purchase", "SMITH", "J"],
    ]);

    expect(result.failure).toBeNull();
    expect(result.normalised.rows[0].description).toBe("SMITH, J");
  });
});

describe("analyseGrid without a profile", () => {
  it("reads a layout it has to work out, with the bank unknown", () => {
    const result = analyseGrid([
      ["Date", "Type", "Description", "Amount", "Balance"],
      ["15 Mar 2026", "DD", "MOBILE PHONE", "-80.78", "613.32"],
      ["13 Mar 2026", "BP", "CORNER SHOP", "-70.00", "694.10"],
      ["12 Mar 2026", "CR", "EMPLOYER LTD", "1010.00", "764.10"],
    ]);

    expect(result.failure).toBeNull();
    expect(result.bank).toBeNull();
    expect(result.normalised.rows.map((r) => r.date)).toEqual([
      "2026-03-15", "2026-03-13", "2026-03-12",
    ]);
    expect(result.balance).toEqual({ status: "consistent", newestFirst: true });
  });

  it("uses the user's column choices over its own", () => {
    const grid: Grid = [
      ["When", "Ref", "Paid", "Note"],
      ["15/01/2026", "A1", "-4.50", "CORNER SHOP"],
      ["16/01/2026", "A2", "-1.75", "BUS FARE"],
    ];

    const result = analyseGrid(grid, {
      mapping: { date: 0, amount: 2, description: 3 },
    });

    expect(result.detection.uncertain).toEqual([]);
    expect(result.normalised.rows.map((r) => r.description)).toEqual([
      "CORNER SHOP", "BUS FARE",
    ]);
  });

  it("uses the user's date order", () => {
    const result = analyseGrid(
      [
        ["Date", "Description", "Amount"],
        ["01/02/2026", "CORNER SHOP", "-4.50"],
      ],
      { dateOrder: "mdy" },
    );

    expect(result.normalised.rows[0].date).toBe("2026-01-02");
    expect(result.detection.dateOrderCertain).toBe(true);
  });
});

describe("analyseGrid: is this a bank statement?", () => {
  it("rejects a file with no dates", () => {
    const result = analyseGrid([
      ["Name", "Role", "Years"],
      ["Ada", "Engineer", "5"],
      ["Grace", "Admiral", "40"],
    ]);

    expect(result.failure).toBe("no_date_column");
  });

  it("rejects a file with dates but no money", () => {
    const result = analyseGrid([
      ["Date", "Event"],
      ["15/01/2026", "Team meeting"],
      ["16/01/2026", "Dentist"],
    ]);

    expect(result.failure).toBe("no_amount_column");
  });

  it("rejects a file where most rows can't be read", () => {
    const result = analyseGrid([
      ["Date", "Description", "Amount"],
      ["15/01/2026", "CORNER SHOP", "-4.50"],
      ["16/01/2026", "BUS FARE", "unknown"],
      ["17/01/2026", "CAFE", "n/a"],
    ]);

    expect(result.failure).toBe("mostly_unreadable");
  });

  it("rejects a date column with both day-first and month-first dates", () => {
    const result = analyseGrid([
      ["Date", "Description", "Amount"],
      ["25/01/2026", "CORNER SHOP", "-4.50"],
      ["01/25/2026", "BUS FARE", "-1.75"],
    ]);

    expect(result.failure).toBe("conflicting_dates");
  });

  it("rejects a statement with nothing but zero-amount rows", () => {
    const result = analyseGrid([
      MONZO_HEADER,
      monzoLine("tx_001", "15/01/2026", "Card payment", "Shop", "0.00"),
    ]);

    expect(result.failure).toBe("no_transactions");
  });
});