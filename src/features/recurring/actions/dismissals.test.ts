import { beforeEach, describe, expect, it, vi } from "vitest";

import { dismissRecurring, restoreRecurring, type DismissalState } from "./dismissals";

type Dismissal = { userId: string; merchantKey: string };

const fake = vi.hoisted(() => ({
  userId: "user-1" as string | null,
  allowed: true,
  rateKeys: [] as string[],
  dismissals: [] as Dismissal[],
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
  LIMITS: { recurringUser: { limit: 60, windowSeconds: 3600 } },
  rateLimit: async (key: string) => {
    fake.rateKeys.push(key);
    return { allowed: fake.allowed, remaining: 0, resetAt: new Date() };
  },
}));
vi.mock("@/lib/db", () => ({
  db: {
    recurringDismissal: {
      upsert: async ({ where }: { where: { userId_merchantKey: Dismissal } }) => {
        const { userId, merchantKey } = where.userId_merchantKey;
        if (!fake.dismissals.some((d) => d.userId === userId && d.merchantKey === merchantKey)) {
          fake.dismissals.push({ userId, merchantKey });
        }
      },
      deleteMany: async ({ where }: { where: Dismissal }) => {
        fake.dismissals = fake.dismissals.filter(
          (d) => !(d.userId === where.userId && d.merchantKey === where.merchantKey),
        );
      },
    },
  },
}));

const IDLE: DismissalState = { status: "idle" };
const form = (merchantKey?: string) => {
  const data = new FormData();
  if (merchantKey !== undefined) data.set("merchantKey", merchantKey);
  return data;
};

beforeEach(() => {
  fake.userId = "user-1";
  fake.allowed = true;
  fake.rateKeys.length = 0;
  fake.revalidated.length = 0;
  fake.dismissals = [{ userId: "user-2", merchantKey: "netflix" }];
});

describe("dismissRecurring", () => {
  it("remembers the merchant for this user and refreshes both views", async () => {
    const state = await dismissRecurring(IDLE, form("netflix"));
    expect(state).toEqual({ status: "done", action: "dismissed", merchantKey: "netflix" });
    expect(fake.dismissals).toContainEqual({ userId: "user-1", merchantKey: "netflix" });
    expect(fake.revalidated).toEqual(["/dashboard", "/recurring"]);
  });

  it("is fine to dismiss twice", async () => {
    await dismissRecurring(IDLE, form("netflix"));
    await dismissRecurring(IDLE, form("netflix"));
    expect(fake.dismissals.filter((d) => d.userId === "user-1")).toHaveLength(1);
  });

  it("asks a signed-out user to sign in", async () => {
    fake.userId = null;
    expect(await dismissRecurring(IDLE, form("netflix"))).toEqual({
      status: "error",
      message: "Please sign in again.",
    });
    expect(fake.rateKeys).toEqual([]);
  });

  it("rate limits per user", async () => {
    fake.allowed = false;
    expect(await dismissRecurring(IDLE, form("netflix"))).toMatchObject({ status: "error" });
    expect(fake.rateKeys).toEqual(["recurring:user:user-1"]);
    expect(fake.dismissals).toHaveLength(1);
  });

  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["not a merchant key", "<script>"],
    ["upper case", "Netflix"],
    ["too long", "a".repeat(201)],
  ])("rejects a %s key", async (_label, key) => {
    expect(await dismissRecurring(IDLE, form(key))).toMatchObject({ status: "error" });
    expect(fake.dismissals).toHaveLength(1);
  });
});

describe("restoreRecurring", () => {
  it("removes only this user's dismissal", async () => {
    fake.dismissals.push({ userId: "user-1", merchantKey: "netflix" });
    const state = await restoreRecurring(IDLE, form("netflix"));
    expect(state).toEqual({ status: "done", action: "restored", merchantKey: "netflix" });
    expect(fake.dismissals).toEqual([{ userId: "user-2", merchantKey: "netflix" }]);
    expect(fake.revalidated).toEqual(["/dashboard", "/recurring"]);
  });
});
