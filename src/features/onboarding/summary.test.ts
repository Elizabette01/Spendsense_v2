import { describe, expect, it, vi } from "vitest";

import { onboardingStateFor } from "./queries";
import { buildOnboardingSummary, type SummaryRow } from "./summary";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/session", () => ({ getSession: async () => null }));

const GROCERIES = { categoryId: "sys_groceries", categoryName: "Groceries", categoryType: "EXPENSE" } as const;
const EATING_OUT = { categoryId: "sys_eating_out", categoryName: "Eating out", categoryType: "EXPENSE" } as const;
const SALARY = { categoryId: "sys_salary", categoryName: "Salary", categoryType: "INCOME" } as const;
const SAVINGS = { categoryId: "sys_savings", categoryName: "Savings", categoryType: "TRANSFER" } as const;
const NONE = { categoryId: null, categoryName: null, categoryType: null } as const;

function row(
  date: string,
  amountMinor: number,
  category: Pick<SummaryRow, "categoryId" | "categoryName" | "categoryType">,
  merchant = "Shop",
): SummaryRow {
  return { date: new Date(`${date}T00:00:00Z`), amountMinor, merchant, ...category };
}

describe("onboardingStateFor", () => {
  const blank = { completedAt: null, skippedAt: null };
  it.each([
    [null, 0, "needed"],
    [blank, 0, "needed"],
    [null, 1, "done"],
    [{ ...blank, completedAt: new Date() }, 0, "done"],
    [{ ...blank, skippedAt: new Date() }, 0, "done"],
  ] as const)("%j with %d statements is %s", (record, statements, expected) => {
    expect(onboardingStateFor(record, statements)).toBe(expected);
  });
});

describe("buildOnboardingSummary", () => {
  it("is null without transactions", () => {
    expect(buildOnboardingSummary([], 300_000)).toBeNull();
  });

  it("describes the latest month", () => {
    const summary = buildOnboardingSummary(
      [
        row("2026-10-01", 300_000, SALARY),
        row("2026-10-03", -40_000, GROCERIES),
        row("2026-10-09", -28_000, GROCERIES),
        row("2026-10-12", -15_000, EATING_OUT),
        row("2026-10-15", -99_000, NONE), // needs review: never the top category
        row("2026-10-20", -50_000, SAVINGS), // a transfer: not spending
      ],
      null,
    );
    expect(summary).toMatchObject({
      month: "2026-10",
      transactionCount: 6,
      topCategory: { name: "Groceries", amountMinor: 68_000 },
      // 3,000 in, 1,820 spent (transfer left out) → 1,180 saved, 39%
      saving: { ratePercent: 39, savedMinor: 118_000, incomeFrom: "statement" },
      recurring: { enoughData: false, count: 0, monthlyTotalMinor: 0 },
      noticed: null,
    });
  });

  it("uses the step-1 income when the statement has none this month", () => {
    const summary = buildOnboardingSummary([row("2026-10-03", -80_000, GROCERIES)], 200_000);
    expect(summary?.saving).toEqual({ ratePercent: 60, savedMinor: 120_000, incomeFrom: "answer" });
  });

  it("has no saving rate without any income", () => {
    expect(buildOnboardingSummary([row("2026-10-03", -80_000, GROCERIES)], null)?.saving).toBeNull();
    expect(buildOnboardingSummary([row("2026-10-03", -80_000, GROCERIES)], 0)?.saving).toBeNull();
  });

  it("can show a negative saving rate", () => {
    const summary = buildOnboardingSummary(
      [row("2026-10-01", 100_000, SALARY), row("2026-10-03", -150_000, GROCERIES)],
      null,
    );
    expect(summary?.saving).toEqual({ ratePercent: -50, savedMinor: -50_000, incomeFrom: "statement" });
  });

  it("compares the top category with the month before", () => {
    const summary = buildOnboardingSummary(
      [row("2026-09-05", -50_000, GROCERIES), row("2026-10-05", -61_500, GROCERIES)],
      null,
    );
    expect(summary?.noticed).toEqual({ categoryName: "Groceries", changePercent: 23, previousMonth: "2026-09" });
  });

  it.each([
    ["only one month of data", [row("2026-10-05", -60_000, GROCERIES)]],
    ["the category is new this month", [row("2026-09-05", -50_000, EATING_OUT), row("2026-10-05", -60_000, GROCERIES)]],
    ["nothing changed", [row("2026-09-05", -60_000, GROCERIES), row("2026-10-05", -60_000, GROCERIES)]],
  ])("notices nothing when %s", (_case, rows) => {
    expect(buildOnboardingSummary(rows, null)?.noticed).toBeNull();
  });

  it("counts recurring payments that are still running", () => {
    const rows = [
      ...["2026-08-01", "2026-09-01", "2026-10-01"].map((date) => row(date, -1_099, NONE, "Netflix")),
      // Stopped in August: already overdue by the latest transaction
      ...["2026-06-10", "2026-07-10", "2026-08-10"].map((date) => row(date, -2_500, NONE, "Old gym")),
      row("2026-10-20", -500, GROCERIES),
    ];
    expect(buildOnboardingSummary(rows, null)?.recurring).toEqual({
      enoughData: true,
      count: 1,
      monthlyTotalMinor: 1_099,
    });
  });
});
