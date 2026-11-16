import { beforeEach, describe, expect, it, vi } from "vitest";

import { recategoriseTransaction, type RecategoriseState } from "./recategorise";

type FakeTransaction = {
  id: string;
  userId: string;
  merchant: string | null;
  description: string;
  categoryId: string | null;
  categorisedBy: string | null;
};

type FakeRule = { userId: string; merchantKey: string; categoryId: string };

const fake = vi.hoisted(() => ({
  userId: "user-1" as string | null,
  allowed: true,
  rateKeys: [] as string[],
  transactions: [] as FakeTransaction[],
  categories: [] as { id: string; userId: string | null }[],
  rules: [] as FakeRule[],
  revalidated: [] as string[],
}));

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => {
    fake.revalidated.push(path);
  },
}));

vi.mock("@/auth", () => ({
  auth: async () => (fake.userId ? { user: { id: fake.userId } } : null),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { recategoriseUser: { limit: 120, windowSeconds: 3600 } },
  rateLimit: async (key: string) => {
    fake.rateKeys.push(key);
    return { allowed: fake.allowed, remaining: 0, resetAt: new Date() };
  },
}));

vi.mock("@/lib/db", () => {
  type Where = {
    id?: string;
    userId?: string;
    merchant?: { in?: string[]; not?: null };
    NOT?: { id: string };
  };
  const matches = (row: FakeTransaction, where: Where) =>
    (where.id === undefined || row.id === where.id) &&
    (where.userId === undefined || row.userId === where.userId) &&
    (where.merchant?.in === undefined ||
      (row.merchant !== null && where.merchant.in.includes(row.merchant))) &&
    (where.merchant?.not !== null || row.merchant !== null) &&
    (where.NOT === undefined || row.id !== where.NOT.id);

  const client = {
    transaction: {
      findFirst: async ({ where }: { where: Where }) =>
        fake.transactions.find((row) => matches(row, where)) ?? null,
      findMany: async ({ where }: { where: Where }) => {
        const seen = new Set<string | null>();
        return fake.transactions
          .filter((row) => matches(row, where))
          .filter((row) => !seen.has(row.merchant) && seen.add(row.merchant))
          .map((row) => ({ merchant: row.merchant }));
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: Where;
        data: Partial<FakeTransaction>;
      }) => {
        const hit = fake.transactions.filter((row) => matches(row, where));
        for (const row of hit) Object.assign(row, data);
        return { count: hit.length };
      },
    },
    category: {
      findFirst: async ({
        where,
      }: {
        where: { id: string; OR: { userId: string | null }[] };
      }) =>
        fake.categories.find(
          (category) =>
            category.id === where.id &&
            where.OR.some((option) => option.userId === category.userId),
        ) ?? null,
    },
    merchantRule: {
      upsert: async ({
        where,
        create,
        update,
      }: {
        where: { userId_merchantKey: { userId: string; merchantKey: string } };
        create: FakeRule;
        update: { categoryId: string };
      }) => {
        const { userId, merchantKey } = where.userId_merchantKey;
        const existing = fake.rules.find(
          (rule) => rule.userId === userId && rule.merchantKey === merchantKey,
        );
        if (existing) Object.assign(existing, update);
        else fake.rules.push({ ...create });
      },
    },
    $transaction: async (callback: (tx: unknown) => Promise<unknown>) => callback(client),
  };
  return { db: client };
});

const IDLE: RecategoriseState = { status: "idle" };

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

function tx(
  id: string,
  userId: string,
  merchant: string | null,
  description = merchant?.toUpperCase() ?? "",
): FakeTransaction {
  return { id, userId, merchant, description, categoryId: null, categorisedBy: null };
}

beforeEach(() => {
  fake.userId = "user-1";
  fake.allowed = true;
  fake.rateKeys.length = 0;
  fake.revalidated.length = 0;
  fake.rules.length = 0;
  fake.categories = [
    { id: "sys_groceries", userId: null },
    { id: "sys_eating_out", userId: null },
    { id: "cat_mine", userId: "user-1" },
    { id: "cat_theirs", userId: "user-2" },
  ];
  fake.transactions = [
    tx("t1", "user-1", "Tesco Stores"),
    tx("t2", "user-1", "Tesco Stores"),
    tx("t3", "user-1", "TESCO STORES"),
    tx("t4", "user-1", "Pret A Manger"),
    tx("t5", "user-2", "Tesco Stores"),
  ];
});

const byId = (id: string) => fake.transactions.find((row) => row.id === id)!;

describe("recategoriseTransaction: checks", () => {
  it("asks a signed-out user to sign in", async () => {
    fake.userId = null;
    const state = await recategoriseTransaction(
      IDLE,
      form({ transactionId: "t1", categoryId: "sys_groceries" }),
    );
    expect(state).toEqual({ status: "error", message: "Please sign in again." });
    expect(fake.rateKeys).toEqual([]);
  });

  it("rate limits per user", async () => {
    fake.allowed = false;
    const state = await recategoriseTransaction(
      IDLE,
      form({ transactionId: "t1", categoryId: "sys_groceries" }),
    );
    expect(state).toMatchObject({ status: "error" });
    expect(fake.rateKeys).toEqual(["recategorise:user:user-1"]);
    expect(byId("t1").categoryId).toBeNull();
  });

  it.each([
    ["no transaction", { categoryId: "sys_groceries" }],
    ["no category", { transactionId: "t1" }],
    ["an odd checkbox value", { transactionId: "t1", categoryId: "sys_groceries", applyToMerchant: "yes" }],
  ])("rejects %s", async (_label, fields) => {
    const state = await recategoriseTransaction(IDLE, form(fields));
    expect(state).toMatchObject({ status: "error" });
    expect(byId("t1").categoryId).toBeNull();
  });

  it("won't change another user's transaction", async () => {
    const state = await recategoriseTransaction(
      IDLE,
      form({ transactionId: "t5", categoryId: "sys_groceries" }),
    );
    expect(state).toEqual({
      status: "error",
      message: "We couldn't find that transaction.",
    });
    expect(byId("t5").categoryId).toBeNull();
  });

  it("rejects another user's own category", async () => {
    const state = await recategoriseTransaction(
      IDLE,
      form({ transactionId: "t1", categoryId: "cat_theirs" }),
    );
    expect(state).toEqual({ status: "error", message: "Please choose a valid category." });
    expect(byId("t1").categoryId).toBeNull();
  });

  it("rejects a category that doesn't exist", async () => {
    const state = await recategoriseTransaction(
      IDLE,
      form({ transactionId: "t1", categoryId: "nope" }),
    );
    expect(state).toMatchObject({ status: "error" });
  });
});

describe("recategoriseTransaction: one transaction", () => {
  it("updates only that transaction and marks it as the user's choice", async () => {
    const state = await recategoriseTransaction(
      IDLE,
      form({ transactionId: "t1", categoryId: "sys_groceries" }),
    );

    expect(state).toEqual({ status: "done", updatedCount: 1 });
    expect(byId("t1")).toMatchObject({ categoryId: "sys_groceries", categorisedBy: "USER" });
    expect(byId("t2").categoryId).toBeNull();
    expect(fake.rules).toEqual([]);
    expect(fake.revalidated).toEqual(["/transactions", "/dashboard"]);
  });

  it("accepts the user's own category", async () => {
    const state = await recategoriseTransaction(
      IDLE,
      form({ transactionId: "t4", categoryId: "cat_mine", applyToMerchant: "false" }),
    );
    expect(state).toEqual({ status: "done", updatedCount: 1 });
    expect(byId("t4").categoryId).toBe("cat_mine");
  });
});

describe("recategoriseTransaction: whole merchant", () => {
  it("updates every transaction of this user from the merchant", async () => {
    const state = await recategoriseTransaction(
      IDLE,
      form({ transactionId: "t1", categoryId: "sys_groceries", applyToMerchant: "on" }),
    );

    expect(state).toEqual({ status: "done", updatedCount: 3 });
    for (const id of ["t1", "t2", "t3"]) {
      expect(byId(id)).toMatchObject({ categoryId: "sys_groceries", categorisedBy: "USER" });
    }
    expect(byId("t4").categoryId).toBeNull(); // different merchant
    expect(byId("t5").categoryId).toBeNull(); // another user
  });

  it("remembers the choice for future imports", async () => {
    await recategoriseTransaction(
      IDLE,
      form({ transactionId: "t1", categoryId: "sys_groceries", applyToMerchant: "on" }),
    );
    expect(fake.rules).toEqual([
      { userId: "user-1", merchantKey: "tesco stores", categoryId: "sys_groceries" },
    ]);
  });

  it("updates the remembered rule instead of adding a second one", async () => {
    await recategoriseTransaction(
      IDLE,
      form({ transactionId: "t1", categoryId: "sys_groceries", applyToMerchant: "on" }),
    );
    await recategoriseTransaction(
      IDLE,
      form({ transactionId: "t2", categoryId: "cat_mine", applyToMerchant: "on" }),
    );
    expect(fake.rules).toEqual([
      { userId: "user-1", merchantKey: "tesco stores", categoryId: "cat_mine" },
    ]);
  });

  it("works out the merchant for an older row saved without one", async () => {
    fake.transactions.push(tx("t6", "user-1", null, "TESCO STORES 4521 LONDON GB"));

    const state = await recategoriseTransaction(
      IDLE,
      form({ transactionId: "t6", categoryId: "sys_groceries", applyToMerchant: "on" }),
    );

    expect(state).toEqual({ status: "done", updatedCount: 4 });
    expect(byId("t6")).toMatchObject({ merchant: "Tesco Stores", categoryId: "sys_groceries" });
    expect(fake.rules[0].merchantKey).toBe("tesco stores");
  });
});
