import { beforeEach, describe, expect, it, vi } from "vitest";

import { aiCategoriseNeedsReview } from "./ai-categorise";

type FakeTransaction = {
  id: string;
  userId: string;
  description: string;
  merchant: string | null;
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

type FakeAnswer = { merchantKey: string; direction: "in" | "out"; categoryId: string; confidence: "high" | "low" };

const fake = vi.hoisted(() => ({
  userId: "user-1" as string | null,
  allowed: true,
  rateKeys: [] as string[],
  transactions: [] as FakeTransaction[],
  rules: [] as FakeRule[],
  revalidated: [] as string[],
  hasKey: true,
  aiReply: (() => []) as (sent: { merchantKey: string; direction: "in" | "out" }[]) => FakeAnswer[],
  sent: [] as unknown[],
  /** Runs while the AI is "thinking": lets a test change data meanwhile. */
  duringAi: null as null | (() => void),
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
  LIMITS: { aiCategoriseUser: { limit: 5, windowSeconds: 3600 } },
  rateLimit: async (key: string) => {
    fake.rateKeys.push(key);
    return { allowed: fake.allowed, remaining: 0, resetAt: new Date() };
  },
}));

// The real ai.ts runs against a fake client: no test calls the real API
vi.mock("@/lib/ai/client", () => ({
  getAnthropic: () =>
    fake.hasKey
      ? {
          messages: {
            parse: async (params: { messages: { content: string }[] }) => {
              const items = JSON.parse(params.messages[0].content);
              fake.sent.push(...items);
              fake.duringAi?.();
              return { parsed_output: { answers: fake.aiReply(items) }, stop_reason: "end_turn" };
            },
          },
        }
      : null,
}));

vi.mock("@/lib/db", () => {
  type Where = { userId: string; categoryId?: null; id?: { in: string[] } };
  const matches = (row: FakeTransaction, where: Where) =>
    row.userId === where.userId &&
    (where.categoryId === undefined || row.categoryId === null) &&
    (where.id === undefined || where.id.in.includes(row.id));

  const client = {
    transaction: {
      findMany: async ({ where, take }: { where: Where; take?: number }) =>
        fake.transactions.filter((row) => matches(row, where)).slice(0, take).map((row) => ({ ...row })),
      updateMany: async ({ where, data }: { where: Where; data: Partial<FakeTransaction> }) => {
        const hit = fake.transactions.filter((row) => matches(row, where));
        for (const row of hit) Object.assign(row, data);
        return { count: hit.length };
      },
    },
    merchantRule: {
      findMany: async ({ where }: { where: { userId: string } }) =>
        fake.rules
          .filter((rule) => rule.userId === where.userId)
          .map(({ merchantKey, direction, categoryId, source, lowConfidence }) => ({
            merchantKey, direction, categoryId, source, lowConfidence,
          })),
      createMany: async ({ data, skipDuplicates }: { data: FakeRule[]; skipDuplicates?: boolean }) => {
        for (const rule of data) {
          const exists = fake.rules.some(
            (r) => r.userId === rule.userId && r.merchantKey === rule.merchantKey && r.direction === rule.direction,
          );
          if (exists && skipDuplicates) continue;
          if (exists) throw new Error("unique violation");
          fake.rules.push(rule);
        }
      },
    },
    $transaction: async (callback: (tx: unknown) => Promise<unknown>) => callback(client),
  };
  return { db: client };
});

const run = () => aiCategoriseNeedsReview();

function tx(id: string, description: string, extra: Partial<FakeTransaction> = {}): FakeTransaction {
  return {
    id,
    userId: "user-1",
    description,
    merchant: null,
    amountMinor: -1000,
    categoryId: null,
    categorisedBy: null,
    categoryLowConfidence: false,
    ...extra,
  };
}

const byId = (id: string) => fake.transactions.find((row) => row.id === id)!;

beforeEach(() => {
  fake.userId = "user-1";
  fake.allowed = true;
  fake.rateKeys.length = 0;
  fake.revalidated.length = 0;
  fake.rules.length = 0;
  fake.hasKey = true;
  fake.sent.length = 0;
  fake.duringAi = null;
  fake.aiReply = (items) =>
    items
      .filter((item) => item.merchantKey !== "zqx holdings")
      .map((item) => ({ ...item, categoryId: "sys_shopping", confidence: "low" as const }));
  fake.transactions = [
    tx("t1", "ZEPHYR CRUMBS"),
    tx("t2", "ZEPHYR CRUMBS"),
    tx("t3", "ZQX HOLDINGS"),
    tx("t4", "NETFLIX.COM", { categoryId: "sys_subscriptions", categorisedBy: "RULE" }),
    tx("t5", "ZEPHYR CRUMBS", { userId: "user-2" }),
  ];
});

describe("aiCategoriseNeedsReview: checks", () => {
  it("asks a signed-out user to sign in", async () => {
    fake.userId = null;
    expect(await run()).toEqual({ status: "error", message: "Please sign in again." });
    expect(fake.rateKeys).toEqual([]);
  });

  it("says plainly when there's no API key, without using an attempt", async () => {
    fake.hasKey = false;
    expect(await run()).toEqual({
      status: "error",
      message: "AI categorisation isn't available right now.",
    });
    expect(fake.rateKeys).toEqual([]);
    expect(byId("t1").categoryId).toBeNull();
  });

  it("rate limits per user", async () => {
    fake.allowed = false;
    expect(await run()).toMatchObject({ status: "error" });
    expect(fake.rateKeys).toEqual(["ai-categorise:user:user-1"]);
    expect(fake.sent).toEqual([]);
  });
});

describe("aiCategoriseNeedsReview: updating", () => {
  it("fills only uncategorised rows and reports what's left per merchant", async () => {
    const state = await run();

    expect(state).toEqual({ status: "done", updatedCount: 2, stillNeedsReviewMerchantCount: 1 });
    expect(byId("t1")).toMatchObject({ categoryId: "sys_shopping", categorisedBy: "AI", categoryLowConfidence: true });
    expect(byId("t2")).toMatchObject({ categoryId: "sys_shopping", categorisedBy: "AI" });
    expect(byId("t3").categoryId).toBeNull(); // the AI was unsure
    expect(byId("t4")).toMatchObject({ categoryId: "sys_subscriptions", categorisedBy: "RULE" });
    expect(fake.revalidated).toEqual(["/transactions", "/dashboard"]);
  });

  it("asks about each merchant once and saves the answers as AI rules", async () => {
    await run();
    expect(fake.sent).toEqual([
      { merchantKey: "zephyr crumbs", merchant: "Zephyr Crumbs", direction: "out" },
      { merchantKey: "zqx holdings", merchant: "Zqx Holdings", direction: "out" },
    ]);
    expect(fake.rules).toEqual([
      { userId: "user-1", merchantKey: "zephyr crumbs", direction: "OUT", categoryId: "sys_shopping", lowConfidence: true, source: "AI" },
    ]);
  });

  it("never overwrites a row the user categorised while the AI was answering", async () => {
    fake.duringAi = () => Object.assign(byId("t1"), { categoryId: "cat_mine", categorisedBy: "USER" });

    const state = await run();

    expect(state).toMatchObject({ status: "done", updatedCount: 1 });
    expect(byId("t1")).toMatchObject({ categoryId: "cat_mine", categorisedBy: "USER" });
    expect(byId("t2")).toMatchObject({ categoryId: "sys_shopping", categorisedBy: "AI" });
  });

  it("never touches or sends another user's rows", async () => {
    await run();
    expect(byId("t5").categoryId).toBeNull();
    expect(fake.sent).toHaveLength(2);
  });

  it("never replaces a USER rule", async () => {
    // A USER rule for this merchant in the other direction doesn't apply…
    fake.rules.push({ userId: "user-1", merchantKey: "zephyr crumbs", direction: "IN", categoryId: "cat_mine", source: "USER", lowConfidence: false });
    // …and one saved while the AI answers is kept as it is
    fake.duringAi = () =>
      fake.rules.push({ userId: "user-1", merchantKey: "zephyr crumbs", direction: "OUT", categoryId: "cat_mine", source: "USER", lowConfidence: false });

    await run();

    expect(fake.rules.filter((rule) => rule.merchantKey === "zephyr crumbs")).toEqual([
      expect.objectContaining({ direction: "IN", source: "USER", categoryId: "cat_mine" }),
      expect.objectContaining({ direction: "OUT", source: "USER", categoryId: "cat_mine" }),
    ]);
  });

  it("does nothing when there's nothing to review", async () => {
    fake.transactions = [tx("t4", "NETFLIX.COM", { categoryId: "sys_subscriptions", categorisedBy: "RULE" })];
    expect(await run()).toEqual({ status: "done", updatedCount: 0, stillNeedsReviewMerchantCount: 0 });
    expect(fake.sent).toEqual([]);
  });

  it("leaves rows as they are when the AI fails, logging only the error name", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    fake.aiReply = () => {
      throw Object.assign(new Error("ZEPHYR CRUMBS -10.00"), { name: "Oops" });
    };
    // The AI failing is not an error for the action: rows just stay as they are
    expect(await run()).toMatchObject({ status: "done", updatedCount: 0 });
    expect(JSON.stringify(log.mock.calls)).not.toContain("ZEPHYR");
    log.mockRestore();
  });
});
