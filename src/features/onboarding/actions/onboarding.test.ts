import { beforeEach, describe, expect, it, vi } from "vitest";

import { completeOnboarding, saveGoal, saveIncome, skipOnboarding } from "./onboarding";

type Row = Record<string, unknown> & { userId: string };

const fake = vi.hoisted(() => ({
  userId: "user-1" as string | null,
  allowed: true,
  failWrites: false,
  rateKeys: [] as string[],
  rows: [] as Row[],
  revalidated: [] as string[],
  redirects: [] as string[],
}));

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => {
    fake.revalidated.push(path);
  },
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    fake.redirects.push(path);
    throw new Error("NEXT_REDIRECT");
  },
}));

vi.mock("@/auth", () => ({
  auth: async () => (fake.userId ? { user: { id: fake.userId } } : null),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { onboardingUser: { limit: 30, windowSeconds: 3600 } },
  rateLimit: async (key: string) => {
    fake.rateKeys.push(key);
    return { allowed: fake.allowed, remaining: 0, resetAt: new Date() };
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    onboarding: {
      upsert: async ({
        where,
        create,
        update,
      }: {
        where: { userId: string };
        create: Row;
        update: Record<string, unknown>;
      }) => {
        if (fake.failWrites) throw new TypeError("database down");
        const row = fake.rows.find((existing) => existing.userId === where.userId);
        if (row) Object.assign(row, update);
        else fake.rows.push({ ...create });
      },
    },
  },
}));

const IDLE = { status: "idle" } as const;

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  fake.userId = "user-1";
  fake.allowed = true;
  fake.failWrites = false;
  fake.rateKeys = [];
  fake.rows = [];
  fake.revalidated = [];
  fake.redirects = [];
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("saveIncome", () => {
  it.each([
    ["3200", 320_000],
    ["3,200", 320_000],
    ["£3,200", 320_000],
    [" 2 500 ", 250_000],
    ["0", 0],
    ["1000000", 100_000_000],
  ])("stores %j as pence", async (typed, pence) => {
    expect(await saveIncome(IDLE, form({ monthlyIncome: typed }))).toEqual({ status: "saved" });
    expect(fake.rows).toEqual([{ userId: "user-1", monthlyIncomeMinor: pence }]);
  });

  it.each(["", "abc", "3200.50", "-100", "1000001", "1e5"])("rejects %j", async (typed) => {
    const result = await saveIncome(IDLE, form({ monthlyIncome: typed }));
    expect(result.status).toBe("error");
    expect(fake.rows).toEqual([]);
  });

  it("updates the same row on a second save", async () => {
    await saveIncome(IDLE, form({ monthlyIncome: "1000" }));
    await saveIncome(IDLE, form({ monthlyIncome: "2000" }));
    expect(fake.rows).toEqual([{ userId: "user-1", monthlyIncomeMinor: 200_000 }]);
  });

  it("ignores a userId sent in the form", async () => {
    await saveIncome(IDLE, form({ monthlyIncome: "1000", userId: "someone-else" }));
    expect(fake.rows[0].userId).toBe("user-1");
  });

  it("needs a session", async () => {
    fake.userId = null;
    expect(await saveIncome(IDLE, form({ monthlyIncome: "1000" }))).toEqual({
      status: "error",
      message: "Please sign in again.",
    });
    expect(fake.rateKeys).toEqual([]);
  });

  it("is rate-limited per user", async () => {
    fake.allowed = false;
    const result = await saveIncome(IDLE, form({ monthlyIncome: "1000" }));
    expect(result.status).toBe("error");
    expect(fake.rateKeys).toEqual(["onboarding:user:user-1"]);
    expect(fake.rows).toEqual([]);
  });

  it("logs only the error's name when the database fails", async () => {
    fake.failWrites = true;
    const result = await saveIncome(IDLE, form({ monthlyIncome: "1000" }));
    expect(result).toEqual({ status: "error", message: "Something went wrong. Please try again." });
    expect(console.error).toHaveBeenCalledWith("[onboarding] save failed:", "TypeError");
  });
});

describe("saveGoal", () => {
  it("stores a known goal", async () => {
    expect(await saveGoal(IDLE, form({ goal: "GET_OUT_OF_DEBT" }))).toEqual({ status: "saved" });
    expect(fake.rows).toEqual([{ userId: "user-1", goal: "GET_OUT_OF_DEBT" }]);
  });

  it.each(["", "BECOME_RICH", "save_more"])("rejects %j", async (goal) => {
    expect(await saveGoal(IDLE, form({ goal }))).toEqual({
      status: "error",
      message: "Choose a goal to continue.",
    });
    expect(fake.rows).toEqual([]);
  });

  it("keeps the income already saved", async () => {
    await saveIncome(IDLE, form({ monthlyIncome: "1000" }));
    await saveGoal(IDLE, form({ goal: "SAVE_MORE" }));
    expect(fake.rows).toEqual([{ userId: "user-1", monthlyIncomeMinor: 100_000, goal: "SAVE_MORE" }]);
  });
});

describe.each([
  ["skipOnboarding", skipOnboarding, "skippedAt"],
  ["completeOnboarding", completeOnboarding, "completedAt"],
] as const)("%s", (_name, action, field) => {
  it(`sets ${field} and goes to the dashboard`, async () => {
    await expect(action()).rejects.toThrow("NEXT_REDIRECT");
    expect(fake.rows[0][field]).toBeInstanceOf(Date);
    expect(fake.revalidated).toEqual(["/dashboard"]);
    expect(fake.redirects).toEqual(["/dashboard"]);
  });

  it("stays put when the save fails", async () => {
    fake.failWrites = true;
    expect((await action()).status).toBe("error");
    expect(fake.redirects).toEqual([]);
  });

  it("needs a session", async () => {
    fake.userId = null;
    expect((await action()).status).toBe("error");
    expect(fake.rows).toEqual([]);
  });
});
