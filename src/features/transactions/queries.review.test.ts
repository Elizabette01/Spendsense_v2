import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = { id: string; userId: string; merchant: string | null; description: string; amountMinor: number; categoryId: string | null };

const fake = vi.hoisted(() => ({
  userId: "user-1" as string | null,
  rows: [] as Row[],
  lastWhere: null as unknown,
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/ai/client", () => ({ getAnthropic: () => null }));
vi.mock("@/lib/session", () => ({
  getSession: async () => (fake.userId ? { user: { id: fake.userId } } : null),
}));
vi.mock("@/lib/db", () => ({
  db: {
    transaction: {
      findMany: async ({ where }: { where: { userId: string; categoryId?: null } }) => {
        fake.lastWhere = where;
        return fake.rows.filter(
          (row) => row.userId === where.userId && (where.categoryId !== null || row.categoryId === null),
        );
      },
    },
  },
}));

import { getReviewMerchants } from "./queries";

function row(id: string, merchant: string | null, amountMinor: number, extra: Partial<Row> = {}): Row {
  return { id, userId: "user-1", merchant, description: (merchant ?? "").toUpperCase(), amountMinor, categoryId: null, ...extra };
}

beforeEach(() => {
  fake.userId = "user-1";
  fake.lastWhere = null;
  fake.rows = [
    row("t1", "Zephyr Crumbs", -300),
    row("t2", "ZEPHYR CRUMBS", -200), // same key, different spelling
    row("t3", "Zephyr Crumbs", 500), // same merchant, money in: its own entry
    row("t4", null, -900, { description: "J SMITH" }), // older row with no merchant saved
    row("t5", "Netflix", -999, { categoryId: "sys_subscriptions" }), // already categorised
    row("t6", "Zephyr Crumbs", -100, { userId: "user-2" }), // another user
  ];
});

describe("getReviewMerchants", () => {
  it("groups uncategorised rows by merchant key and direction, most transactions first", async () => {
    const groups = await getReviewMerchants();

    expect(groups).toEqual([
      { key: "zephyr crumbs|OUT", merchant: "Zephyr Crumbs", direction: "OUT", transactionCount: 2, totalMinor: -500, transactionId: "t1" },
      { key: "j smith|OUT", merchant: "J Smith", direction: "OUT", transactionCount: 1, totalMinor: -900, transactionId: "t4" },
      { key: "zephyr crumbs|IN", merchant: "Zephyr Crumbs", direction: "IN", transactionCount: 1, totalMinor: 500, transactionId: "t3" },
    ]);
  });

  it("only reads this user's rows with no category", async () => {
    await getReviewMerchants();
    expect(fake.lastWhere).toMatchObject({ userId: "user-1", categoryId: null });
  });

  it("returns nothing when signed out", async () => {
    fake.userId = null;
    expect(await getReviewMerchants()).toEqual([]);
  });
});
