import { describe, expect, it } from "vitest";

import {
  currentMonth,
  hasMonth,
  monthKey,
  monthStart,
  monthTotals,
  netBalance,
  percentChange,
  shiftMonth,
  type MoneyRow,
} from "./months";

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const row = (
  iso: string,
  amountMinor: number,
  categoryType: MoneyRow["categoryType"] = "EXPENSE",
): MoneyRow => ({ date: day(iso), amountMinor, categoryType });

describe("months", () => {
  it("keys a date by its UTC month", () => {
    expect(monthKey(day("2026-10-31"))).toBe("2026-10");
    expect(monthKey(new Date("2026-11-01T00:30:00+01:00"))).toBe("2026-10");
  });

  it("shifts across year ends", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2025-12", 1)).toBe("2026-01");
    expect(shiftMonth("2026-10", -5)).toBe("2026-05");
  });

  it("gives the first day of a month", () => {
    expect(monthStart("2026-02").toISOString()).toBe("2026-02-01T00:00:00.000Z");
  });

  it("uses the latest month with data, not today's month", () => {
    expect(currentMonth([row("2026-03-02", -1), row("2026-05-30", -1), row("2026-04-01", -1)])).toBe(
      "2026-05",
    );
    expect(currentMonth([])).toBeNull();
  });

  it("knows which months have data", () => {
    expect(hasMonth([row("2026-03-02", -1)], "2026-03")).toBe(true);
    expect(hasMonth([row("2026-03-02", -1)], "2026-02")).toBe(false);
  });
});

describe("monthTotals", () => {
  const rows = [
    row("2026-05-25", 245_000, "INCOME"),
    row("2026-05-01", -95_000, "EXPENSE"),
    row("2026-05-03", -1_250, null), // needs review: still spending
    row("2026-05-04", 2_000, "INCOME"), // refund
    row("2026-05-26", -30_000, "TRANSFER"), // savings pot: excluded
    row("2026-05-27", 5_000, "TRANSFER"), // own account in: excluded
    row("2026-04-30", -9_999, "EXPENSE"), // other month
  ];

  it("excludes transfers and other months", () => {
    expect(monthTotals(rows, "2026-05")).toEqual({
      incomeMinor: 247_000,
      expensesMinor: 96_250,
      savingsMinor: 150_750,
    });
  });

  it("can have negative savings", () => {
    expect(monthTotals(rows, "2026-04")).toEqual({
      incomeMinor: 0,
      expensesMinor: 9_999,
      savingsMinor: -9_999,
    });
  });
});

describe("percentChange", () => {
  it.each([
    [110, 100, 10],
    [90, 100, -10],
    [-50, -100, 50], // less negative savings is an improvement
    [100, -100, 200],
  ])("%d vs %d → %d%%", (current, previous, expected) => {
    expect(percentChange(current, previous)).toBeCloseTo(expected);
  });

  it("is null with no previous month or a zero base", () => {
    expect(percentChange(100, null)).toBeNull();
    expect(percentChange(100, 0)).toBeNull();
  });
});

describe("netBalance", () => {
  const rows = [
    row("2026-04-01", 10_000, "INCOME"),
    row("2026-04-02", -3_000),
    row("2026-05-01", -30_000, "TRANSFER"), // transfers count: it's all money in minus out
    row("2026-05-02", 50_000, "INCOME"),
  ];

  it("adds up everything imported", () => {
    expect(netBalance(rows)).toBe(27_000);
  });

  it("can stop at a month", () => {
    expect(netBalance(rows, "2026-04")).toBe(7_000);
  });
});
