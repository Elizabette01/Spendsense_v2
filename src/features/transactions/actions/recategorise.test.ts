import { beforeEach, describe, expect, it, vi } from "vitest";

import { recategoriseTransaction, type RecategoriseState } from "./recategorise";

type FakeTransaction = {
  id: string;
  userId: string;
  merchant: string | null;
  description: string;
  amountMinor: number;
  categoryId: string | null;
  categorisedBy: string | null;
  categoryLowConfidence: boolean;
};

type FakeRule = {
  userId: string;
  merchantKey: string;
  direction: "IN" | "OUT";
  categoryId: string;
  source: "USER" | "AI";
  lowConfidence: boolean;
};

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
vi.mock("@/lib/ai/client", () => ({ getAnthropic: () => null }));

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
  type Condition = {
    categorisedBy?: string | null | { in: string[] };
    categoryId?: string;
  };
  type Where = Condition & {
    id?: string;
    userId?: string;
    merchant?: { in?: string[]; not?: null };
    amountMinor?: { lt?: number; gt?: number };
    NOT?: { id: string };
    OR?: Condition[];
  };

  const meets = (row: FakeTransaction, c: Condition) =>
    (c.categorisedBy === undefined ||
      (c.categorisedBy !== null && typeof c.categorisedBy === "object"
        ? c.categorisedBy.in.includes(row.categorisedBy ?? "")
        : row.categorisedBy === c.categorisedBy)) &&
    (c.categoryId === undefined || row.categoryId === c.categoryId);

  const matches = (row: FakeTransaction, where: Where) =>
    (where.id === undefined || row.id === where.id) &&
    (where.userId === undefined || row.userId === where.userId) &&
    (where.merchant?.in === undefined ||
      (row.merchant !== null && where.merchant.in.includes(row.merchant))) &&
    (where.merchant?.not !== null || row.merchant !== null) &&
    (where.amountMinor?.lt === undefined || row.amountMinor < where.amountMinor.lt) &&
    (where.amountMinor?.gt === undefined || row.amountMinor > where.amountMinor.gt) &&
    (where.NOT === undefined || row.id !== where.NOT.id) &&
    (where.OR === undefined || where.OR.some((c) => meets(row, c)));

  type RuleWhere = {
    userId_merchantKey_direction: { userId: string; merchantKey: string; direction: string };
  };
  const findRule = ({ userId_merchantKey_direction: k }: RuleWhere) =>
    fake.rules.find(
      (rule) =>
        rule.userId === k.userId &&
        rule.merchantKey === k.merchantKey &&
        rule.direction === k.direction,
    );

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
      updateMany: async ({ where, data }: { where: Where; data: Partial<FakeTransaction> }) => {
        const hit = fake.transactions.filter((row) => matches(row, where));
        for (const row of hit) Object.assign(row, data);
        return { count: hit.length };
      },
    },
    category: {
      findFirst: async ({ where }: { where: { id: string; OR: { userId: string | null }[] } }) =>
        fake.categories.find(
          (category) =>
            category.id === where.id &&
            where.OR.some((option) => option.userId === category.userId),
        ) ?? null,
    },
    merchantRule: {
      findUnique: async ({ where }: { where: RuleWhere }) => findRule(where) ?? null,
      upsert: async ({
        where,
        create,
        update,
      }: {
        where: RuleWhere;
        create: FakeRule;
        update: Partial<FakeRule>;
      }) => {
        const existing = findRule(where);
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
  extra: Partial<FakeTransaction> = {},
): FakeTransaction {
  return {
    id,
    userId,
    merchant,
    description: merchant?.toUpperCase() ?? "",
    amountMinor: -1000,
    categoryId: null,
    categorisedBy: null,
    categoryLowConfidence: false,
    ...extra,
  };
}

function userRule(merchantKey: string, categoryId: string, direction: "IN" | "OUT" = "OUT"): FakeRule {
  return { userId: "user-1", merchantKey, direction, categoryId, source: "USER", lowConfidence: false };
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
    { id: "sys_refunds", userId: null },
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

  it("clears the AI 'check' marker", async () => {
    Object.assign(byId("t1"), {
      categoryId: "sys_eating_out",
      categorisedBy: "AI",
      categoryLowConfidence: true,
    });
    await recategoriseTransaction(IDLE, form({ transactionId: "t1", categoryId: "sys_groceries" }));
    expect(byId("t1")).toMatchObject({ categorisedBy: "USER", categoryLowConfidence: false });
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

  it("remembers the choice for future imports, as a USER rule for that direction", async () => {
    await recategoriseTransaction(
      IDLE,
      form({ transactionId: "t1", categoryId: "sys_groceries", applyToMerchant: "on" }),
    );
    expect(fake.rules).toEqual([userRule("tesco stores", "sys_groceries", "OUT")]);
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
    expect(fake.rules).toEqual([userRule("tesco stores", "cat_mine")]);
    // Rows carrying the old merchant-wide choice follow the new one
    for (const id of ["t1", "t2", "t3"]) expect(byId(id).categoryId).toBe("cat_mine");
  });

  it("replaces an AI rule with the user's choice", async () => {
    fake.rules.push({ ...userRule("tesco stores", "sys_eating_out"), source: "AI", lowConfidence: true });
    await recategoriseTransaction(
      IDLE,
      form({ transactionId: "t1", categoryId: "sys_groceries", applyToMerchant: "on" }),
    );
    expect(fake.rules).toEqual([userRule("tesco stores", "sys_groceries")]);
  });

  it("updates AI, RULE and uncategorised rows, but leaves rows the user set one by one", async () => {
    Object.assign(byId("t2"), { categoryId: "sys_eating_out", categorisedBy: "AI", categoryLowConfidence: true });
    Object.assign(byId("t3"), { categoryId: "cat_mine", categorisedBy: "USER" });
    fake.transactions.push(tx("t6", "user-1", "Tesco Stores", { categoryId: "sys_refunds", categorisedBy: "RULE" }));

    const state = await recategoriseTransaction(
      IDLE,
      form({ transactionId: "t1", categoryId: "sys_groceries", applyToMerchant: "on" }),
    );

    expect(state).toEqual({ status: "done", updatedCount: 3 });
    expect(byId("t2")).toMatchObject({ categoryId: "sys_groceries", categorisedBy: "USER", categoryLowConfidence: false });
    expect(byId("t6")).toMatchObject({ categoryId: "sys_groceries", categorisedBy: "USER" });
    expect(byId("t3")).toMatchObject({ categoryId: "cat_mine", categorisedBy: "USER" }); // untouched
  });

  it("only touches rows going the same direction", async () => {
    fake.transactions.push(tx("t7", "user-1", "Tesco Stores", { amountMinor: 500 }));

    await recategoriseTransaction(
      IDLE,
      form({ transactionId: "t7", categoryId: "sys_refunds", applyToMerchant: "on" }),
    );

    expect(byId("t7").categoryId).toBe("sys_refunds");
    for (const id of ["t1", "t2", "t3"]) expect(byId(id).categoryId).toBeNull(); // money out
    expect(fake.rules).toEqual([userRule("tesco stores", "sys_refunds", "IN")]);
  });

  it("never touches another user's rows", async () => {
    Object.assign(byId("t5"), { categoryId: "sys_eating_out", categorisedBy: "AI" });
    await recategoriseTransaction(
      IDLE,
      form({ transactionId: "t1", categoryId: "sys_groceries", applyToMerchant: "on" }),
    );
    expect(byId("t5")).toMatchObject({ categoryId: "sys_eating_out", categorisedBy: "AI" });
  });

  it("works out the merchant for an older row saved without one", async () => {
    fake.transactions.push(tx("t6", "user-1", null, { description: "TESCO STORES 4521 LONDON GB" }));

    const state = await recategoriseTransaction(
      IDLE,
      form({ transactionId: "t6", categoryId: "sys_groceries", applyToMerchant: "on" }),
    );

    expect(state).toEqual({ status: "done", updatedCount: 4 });
    expect(byId("t6")).toMatchObject({ merchant: "Tesco Stores", categoryId: "sys_groceries" });
    expect(fake.rules[0].merchantKey).toBe("tesco stores");
  });
});
