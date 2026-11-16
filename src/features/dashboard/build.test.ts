import { describe, expect, it } from "vitest";

import { buildBreakdown, buildDashboard, buildTopMerchants, type DashboardRow } from "./build";

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

function row(
  iso: string,
  amountMinor: number,
  merchant: string,
  category: [string, string, DashboardRow["categoryType"]] | null,
): DashboardRow {
  return {
    date: day(iso),
    amountMinor,
    merchant,
    categoryId: category?.[0] ?? null,
    categoryName: category?.[1] ?? null,
    categoryType: category?.[2] ?? null,
  };
}

const GROCERIES = ["sys_groceries", "Groceries", "EXPENSE"] as [string, string, "EXPENSE"];
const TRANSPORT = ["sys_transport", "Transport", "EXPENSE"] as [string, string, "EXPENSE"];
const BILLS = ["sys_bills", "Bills", "EXPENSE"] as [string, string, "EXPENSE"];
const FUN = ["sys_entertainment", "Entertainment", "EXPENSE"] as [string, string, "EXPENSE"];
const SHOPPING = ["sys_shopping", "Shopping", "EXPENSE"] as [string, string, "EXPENSE"];
const GIFTS = ["sys_gifts", "Gifts", "EXPENSE"] as [string, string, "EXPENSE"];
const SALARY = ["sys_salary", "Salary", "INCOME"] as [string, string, "INCOME"];
const SAVINGS = ["sys_savings", "Savings", "TRANSFER"] as [string, string, "TRANSFER"];

describe("buildDashboard", () => {
  it("has no data with no rows", () => {
    expect(buildDashboard([])).toEqual({ hasData: false });
  });

  const rows: DashboardRow[] = [
    // September
    row("2026-09-25", 200_000, "Acme Salary", SALARY),
    row("2026-09-02", -50_000, "Tesco", GROCERIES),
    // October (the current month)
    row("2026-10-25", 250_000, "Acme Salary", SALARY),
    row("2026-10-03", -60_000, "Tesco", GROCERIES),
    row("2026-10-26", -30_000, "Monzo Pot", SAVINGS), // transfer: not spending
  ];

  it("uses the latest month with data", () => {
    const data = buildDashboard(rows);
    if (!data.hasData) throw new Error("expected data");
    expect(data.month).toBe("2026-10");
  });

  it("works out the cards, excluding transfers from income and expenses", () => {
    const data = buildDashboard(rows);
    if (!data.hasData) throw new Error("expected data");
    expect(data.cards.income).toEqual({ valueMinor: 250_000, changePercent: 25 });
    expect(data.cards.expenses).toEqual({ valueMinor: 60_000, changePercent: 20 });
    expect(data.cards.savings.valueMinor).toBe(190_000);
    expect(data.cards.savings.changePercent).toBeCloseTo(26.67, 1);
    // Net balance counts everything, transfers included: 150,000 → 310,000
    expect(data.cards.netBalance.valueMinor).toBe(310_000);
    expect(data.cards.netBalance.changePercent).toBeCloseTo(106.67, 1);
  });

  it("has no change without a previous month of data", () => {
    const data = buildDashboard(rows.filter((r) => r.date.getUTCMonth() === 9));
    if (!data.hasData) throw new Error("expected data");
    expect(data.cards.income.changePercent).toBeNull();
    expect(data.cards.netBalance.changePercent).toBeNull();
    expect(data.recurring.enoughData).toBe(false);
  });

  it("charts the six months ending at the current month, including empty ones", () => {
    const data = buildDashboard(rows);
    if (!data.hasData) throw new Error("expected data");
    expect(data.incomeVsExpenses.map((m) => m.key)).toEqual([
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
    ]);
    expect(data.incomeVsExpenses[0]).toEqual({ key: "2026-05", incomeMinor: 0, expensesMinor: 0 });
    expect(data.incomeVsExpenses[5]).toEqual({ key: "2026-10", incomeMinor: 250_000, expensesMinor: 60_000 });
  });
});

describe("buildBreakdown", () => {
  const month = [
    row("2026-10-01", -60_000, "Tesco", GROCERIES),
    row("2026-10-02", -20_000, "TfL", TRANSPORT),
    row("2026-10-03", -15_000, "EE", BILLS),
    row("2026-10-04", -10_000, "Odeon", FUN),
    row("2026-10-05", -4_000, "Argos", SHOPPING),
    row("2026-10-06", -1_000, "Moonpig", GIFTS),
    row("2026-10-07", -7_000, "Mystery", null),
    row("2026-10-08", -30_000, "Monzo Pot", SAVINGS),
    row("2026-10-25", 250_000, "Acme Salary", SALARY),
    row("2026-09-30", -99_000, "Tesco", GROCERIES),
  ];

  it("shows the top four, then Other, then Needs review", () => {
    expect(buildBreakdown(month, "2026-10")).toEqual({
      totalMinor: 117_000,
      slices: [
        { id: "sys_groceries", name: "Groceries", amountMinor: 60_000, kind: "category" },
        { id: "sys_transport", name: "Transport", amountMinor: 20_000, kind: "category" },
        { id: "sys_bills", name: "Bills", amountMinor: 15_000, kind: "category" },
        { id: "sys_entertainment", name: "Entertainment", amountMinor: 10_000, kind: "category" },
        { id: "other", name: "Other", amountMinor: 5_000, kind: "other" },
        { id: "review", name: "Needs review", amountMinor: 7_000, kind: "review" },
      ],
    });
  });

  it("leaves out Other and Needs review when empty", () => {
    expect(buildBreakdown(month.slice(0, 2), "2026-10").slices.map((s) => s.id)).toEqual([
      "sys_groceries",
      "sys_transport",
    ]);
  });

  it("ranks the top five merchants by spend this month", () => {
    const tops = buildTopMerchants(
      [...month, row("2026-10-09", -5_000, "TESCO", GROCERIES)],
      "2026-10",
    );
    expect(tops).toEqual([
      { merchant: "Tesco", amountMinor: 65_000 },
      { merchant: "TfL", amountMinor: 20_000 },
      { merchant: "EE", amountMinor: 15_000 },
      { merchant: "Odeon", amountMinor: 10_000 },
      { merchant: "Mystery", amountMinor: 7_000 },
    ]);
  });
});
