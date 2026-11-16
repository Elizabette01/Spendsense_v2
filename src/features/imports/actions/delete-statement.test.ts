import { beforeEach, describe, expect, it, vi } from "vitest";

import { deleteStatement, type DeleteStatementState } from "./delete-statement";

const fake = vi.hoisted(() => ({
  userId: "user-1" as string | null,
  allowed: true,
  rateKeys: [] as string[],
  /** statement id → owner */
  statements: new Map<string, string>(),
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
  LIMITS: { deleteStatementUser: { limit: 20, windowSeconds: 3600 } },
  rateLimit: async (key: string) => {
    fake.rateKeys.push(key);
    return { allowed: fake.allowed, remaining: 0, resetAt: new Date() };
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    statement: {
      deleteMany: async ({ where }: { where: { id: string; userId: string } }) => {
        if (fake.statements.get(where.id) !== where.userId) return { count: 0 };
        fake.statements.delete(where.id);
        return { count: 1 };
      },
    },
  },
}));

const IDLE: DeleteStatementState = { status: "idle" };

function form(statementId?: string): FormData {
  const data = new FormData();
  if (statementId !== undefined) data.set("statementId", statementId);
  return data;
}

beforeEach(() => {
  fake.userId = "user-1";
  fake.allowed = true;
  fake.rateKeys.length = 0;
  fake.statements = new Map([
    ["stmt-mine", "user-1"],
    ["stmt-theirs", "user-2"],
  ]);
  fake.revalidated.length = 0;
});

describe("deleteStatement", () => {
  it("deletes the user's own statement and refreshes the views", async () => {
    const state = await deleteStatement(IDLE, form("stmt-mine"));

    expect(state).toEqual({ status: "done" });
    expect(fake.statements.has("stmt-mine")).toBe(false);
    expect(fake.rateKeys).toEqual(["deletestatement:user:user-1"]);
    expect(fake.revalidated).toEqual(["/imports", "/transactions", "/dashboard"]);
  });

  it("can't delete another user's statement", async () => {
    const state = await deleteStatement(IDLE, form("stmt-theirs"));

    expect(state).toEqual({
      status: "error",
      message: "We couldn't find that statement.",
    });
    expect(fake.statements.get("stmt-theirs")).toBe("user-2");
    expect(fake.revalidated).toEqual([]);
  });

  it("gives the same answer for a statement that doesn't exist", async () => {
    const state = await deleteStatement(IDLE, form("stmt-missing"));
    expect(state).toEqual({
      status: "error",
      message: "We couldn't find that statement.",
    });
  });

  it("asks a signed-out user to sign in", async () => {
    fake.userId = null;
    const state = await deleteStatement(IDLE, form("stmt-mine"));
    expect(state).toEqual({ status: "error", message: "Please sign in again." });
    expect(fake.statements.has("stmt-mine")).toBe(true);
  });

  it("rate limits per user", async () => {
    fake.allowed = false;
    const state = await deleteStatement(IDLE, form("stmt-mine"));
    expect(state).toMatchObject({ status: "error" });
    expect(fake.statements.has("stmt-mine")).toBe(true);
  });

  it.each([undefined, "", "x".repeat(65)])("rejects the id %j", async (id) => {
    const state = await deleteStatement(IDLE, form(id));
    expect(state).toMatchObject({ status: "error" });
    expect(fake.statements.size).toBe(2);
  });
});
