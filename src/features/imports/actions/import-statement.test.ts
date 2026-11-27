import { beforeEach, describe, expect, it, vi } from "vitest";

import { Prisma } from "@/generated/prisma/client";

import { addFingerprints, hashFingerprint } from "../parsers/fingerprint";
import type { NormalisedRow } from "../parsers/types";
import { importStatement, type ImportState } from "./import-statement";

type SavedTransaction = {
  userId: string;
  statementId: string;
  date: Date;
  description: string;
  merchant: string;
  amountMinor: number;
  categoryId: string | null;
  categorisedBy: string | null;
  categoryLowConfidence: boolean;
  fingerprint: string;
};

type FakeRule = {
  userId: string;
  merchantKey: string;
  direction: "IN" | "OUT";
  categoryId: string;
  source: "USER" | "AI";
  lowConfidence: boolean;
};

type FakeAnswer = {
  merchantKey: string;
  direction: "in" | "out";
  categoryId: string;
  confidence: "high" | "low";
};

const fake = vi.hoisted(() => ({
  userId: "user-1" as string | null,
  allowed: true,
  rateKeys: [] as string[],
  /** `${userId}|${fingerprint}` already in the database */
  stored: new Set<string>(),
  statements: [] as Record<string, unknown>[],
  transactions: [] as SavedTransaction[],
  createManyCalls: 0,
  transactionOptions: [] as unknown[],
  failCreateMany: null as Error | null,
  activity: [] as { type: string; userId: string }[],
  afterCallbacks: [] as (() => Promise<void>)[],
  revalidated: [] as string[],
  merchantRules: [] as FakeRule[],
  merchantRuleQueries: 0,
  ruleCreateCalls: [] as { data: FakeRule[]; skipDuplicates?: boolean }[],
  /** null = no API key. Otherwise answers each request (or throws). */
  aiReply: null as
    | null
    | ((sent: { merchantKey: string; direction: "in" | "out" }[]) => FakeAnswer[] | Error),
  aiRequests: 0,
}));

// The real ai.ts runs, against a fake client: no test ever calls the real API
vi.mock("@/lib/ai/client", () => ({
  getAnthropic: () =>
    fake.aiReply === null
      ? null
      : {
          messages: {
            parse: async (params: { messages: { content: string }[] }) => {
              fake.aiRequests += 1;
              const answers = fake.aiReply!(JSON.parse(params.messages[0].content));
              if (answers instanceof Error) throw answers;
              return { parsed_output: { answers }, stop_reason: "end_turn" };
            },
          },
        },
}));

vi.mock("server-only", () => ({}));

vi.mock("next/server", () => ({
  after: (callback: () => Promise<void>) => {
    fake.afterCallbacks.push(callback);
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => {
    fake.revalidated.push(path);
  },
}));

vi.mock("@/auth", () => ({
  auth: async () => (fake.userId ? { user: { id: fake.userId } } : null),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { importStatementUser: { limit: 10, windowSeconds: 3600 } },
  rateLimit: async (key: string) => {
    fake.rateKeys.push(key);
    return { allowed: fake.allowed, remaining: 0, resetAt: new Date() };
  },
}));

vi.mock("@/lib/db", () => {
  const findMany = async ({
    where,
  }: {
    where: { userId: string; fingerprint: { in: string[] } };
  }) =>
    where.fingerprint.in
      .filter((fp) => fake.stored.has(`${where.userId}|${fp}`))
      .map((fingerprint) => ({ fingerprint }));

  return {
    db: {
      transaction: { findMany },
      merchantRule: {
        findMany: async ({ where }: { where: { userId: string } }) => {
          fake.merchantRuleQueries += 1;
          return fake.merchantRules
            .filter((rule) => rule.userId === where.userId)
            .map(({ merchantKey, direction, categoryId, source, lowConfidence }) => ({
              merchantKey, direction, categoryId, source, lowConfidence,
            }));
        },
      },
      activityEvent: {
        create: async ({ data }: { data: { type: string; userId: string } }) => {
          fake.activity.push(data);
        },
      },
      // Runs the callback against a staging area; keeps it only if nothing threw
      $transaction: async (
        callback: (tx: unknown) => Promise<unknown>,
        options: unknown,
      ) => {
        fake.transactionOptions.push(options);
        const statements: Record<string, unknown>[] = [];
        const transactions: SavedTransaction[] = [];
        const tx = {
          statement: {
            create: async ({ data }: { data: Record<string, unknown> }) => {
              const id = `stmt-${fake.statements.length + statements.length + 1}`;
              statements.push({ id, ...data });
              return { id };
            },
          },
          transaction: {
            createMany: async ({ data }: { data: SavedTransaction[] }) => {
              fake.createManyCalls += 1;
              if (fake.failCreateMany) throw fake.failCreateMany;
              transactions.push(...data);
              return { count: data.length };
            },
          },
          merchantRule: {
            // Like Postgres: unique on (userId, merchantKey, direction)
            createMany: async (args: { data: FakeRule[]; skipDuplicates?: boolean }) => {
              fake.ruleCreateCalls.push(args);
              let count = 0;
              for (const rule of args.data) {
                const exists = fake.merchantRules.some(
                  (r) =>
                    r.userId === rule.userId &&
                    r.merchantKey === rule.merchantKey &&
                    r.direction === rule.direction,
                );
                if (exists && args.skipDuplicates) continue;
                if (exists) throw new Error("unique violation");
                fake.merchantRules.push(rule);
                count += 1;
              }
              return { count };
            },
          },
        };
        const result = await callback(tx);
        fake.statements.push(...statements);
        fake.transactions.push(...transactions);
        return result;
      },
    },
  };
});

// All data below is invented.
const HEADER = "Date,Description,Amount";
const LINES = [
  "01/03/2026,FAKE GROCER,-12.50",
  "02/03/2026,EXAMPLE PAYROLL,1000.00",
  "05/03/2026,TEST CAFE,-3.20",
  "04/03/2026,ZERO ROW,0.00",
];
const CSV = [HEADER, ...LINES].join("\n");

/** The rows above as the parser normalises them, in file order (zero row skipped). */
const ROWS: NormalisedRow[] = [
  { rowNumber: 2, date: "2026-03-01", amountMinor: -1250, description: "FAKE GROCER", externalId: null },
  { rowNumber: 3, date: "2026-03-02", amountMinor: 100_000, description: "EXAMPLE PAYROLL", externalId: null },
  { rowNumber: 4, date: "2026-03-05", amountMinor: -320, description: "TEST CAFE", externalId: null },
];
const FINGERPRINTS = addFingerprints(ROWS, null).map((row) => row.fingerprint);
/** What the built-in rules decide for ROWS. */
const CATEGORIES = [
  { merchant: "Fake Grocer", categoryId: null, categorisedBy: null }, // no rule: needs review
  { merchant: "Example Payroll", categoryId: "sys_salary", categorisedBy: "RULE" },
  { merchant: "Test Cafe", categoryId: "sys_eating_out", categorisedBy: "RULE" },
];

function userRule(merchantKey: string, categoryId: string, userId = "user-1"): FakeRule {
  return { userId, merchantKey, direction: "OUT", categoryId, source: "USER", lowConfidence: false };
}

const IDLE: ImportState = { status: "idle" };
const NO_DUPLICATES = JSON.stringify({ overrides: {} });

function form(fields: Record<string, string | File>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

function csvFile(text = CSV, name = "test.csv"): File {
  return new File([text], name, { type: "text/csv" });
}

function importForm(decisions: unknown = { overrides: {} }, file = csvFile()) {
  return form({ file, decisions: JSON.stringify(decisions) });
}

function alreadyImported(fingerprint: string, userId = "user-1") {
  fake.stored.add(`${userId}|${fingerprint}`);
}

beforeEach(() => {
  fake.userId = "user-1";
  fake.allowed = true;
  fake.rateKeys.length = 0;
  fake.stored.clear();
  fake.statements.length = 0;
  fake.transactions.length = 0;
  fake.createManyCalls = 0;
  fake.transactionOptions.length = 0;
  fake.failCreateMany = null;
  fake.activity.length = 0;
  fake.afterCallbacks.length = 0;
  fake.revalidated.length = 0;
  fake.merchantRules.length = 0;
  fake.merchantRuleQueries = 0;
  fake.ruleCreateCalls.length = 0;
  fake.aiReply = null;
  fake.aiRequests = 0;
});

function expectNothingSaved() {
  expect(fake.statements).toEqual([]);
  expect(fake.transactions).toEqual([]);
}

describe("importStatement: checks before reading", () => {
  it("asks a signed-out user to sign in", async () => {
    fake.userId = null;
    const state = await importStatement(IDLE, importForm());
    expect(state).toMatchObject({ status: "error", reason: "signed_out" });
    expect(fake.rateKeys).toEqual([]);
    expectNothingSaved();
  });

  it("rate limits per user", async () => {
    fake.allowed = false;
    const state = await importStatement(IDLE, importForm());
    expect(state).toEqual({
      status: "error",
      reason: "rate_limited",
      message: "Too many attempts. Please try again in an hour.",
    });
    expect(fake.rateKeys).toEqual(["import:user:user-1"]);
    expectNothingSaved();
  });

  it("rejects a missing file", async () => {
    const state = await importStatement(IDLE, form({ decisions: NO_DUPLICATES }));
    expect(state).toMatchObject({ status: "error", reason: "invalid_input" });
  });

  it.each([
    ["missing decisions", {}],
    ["decisions that aren't JSON", { decisions: "{nope" }],
    ["an unknown choice", { decisions: '{"defaultChoice":"maybe"}' }],
    [
      "an override for something that isn't a fingerprint",
      { decisions: '{"overrides":{"abc":"skip"}}' },
    ],
    ["a bad mapping", { decisions: NO_DUPLICATES, mapping: "[1]" }],
  ])("rejects %s", async (_label, fields: Record<string, string>) => {
    const state = await importStatement(IDLE, form({ file: csvFile(), ...fields }));
    expect(state).toMatchObject({ status: "error", reason: "invalid_input" });
    expectNothingSaved();
  });

  it("rejects the wrong file type", async () => {
    const state = await importStatement(
      IDLE,
      importForm(undefined, csvFile(CSV, "notes.txt")),
    );
    expect(state).toMatchObject({ status: "error", reason: "wrong_file_type" });
    expectNothingSaved();
  });

  it("rejects a file that isn't a bank statement", async () => {
    const notGbp = [
      "Date,Description,Amount,Currency",
      "01/03/2026,FAKE GROCER,-12.50,USD",
      "02/03/2026,TEST CAFE,-3.20,USD",
    ].join("\n");
    const state = await importStatement(IDLE, importForm(undefined, csvFile(notGbp)));
    expect(state).toMatchObject({ status: "error", reason: "not_gbp" });
    expectNothingSaved();
  });

  it("does not let a mappable failure through (unlike the preview)", async () => {
    const noAmount = ["Date,Description", "01/03/2026,FAKE GROCER"].join("\n");
    const state = await importStatement(IDLE, importForm(undefined, csvFile(noAmount)));
    expect(state).toMatchObject({ status: "error", reason: "no_amount_column" });
    expectNothingSaved();
  });
});

describe("importStatement: saving", () => {
  it("saves the statement and every row with a cost", async () => {
    const state = await importStatement(IDLE, importForm());

    expect(state).toEqual({
      status: "done",
      result: {
        statementId: "stmt-1",
        importedCount: 3,
        duplicateCount: 0,
        skippedCount: 1,
        issueCount: 0,
        categorisedCount: 2,
        aiCategorisedCount: 0,
        lowConfidenceCount: 0,
        needsReviewCount: 1,
        needsReviewMerchantCount: 1,
        periodStart: "2026-03-01",
        periodEnd: "2026-03-05",
      },
    });

    expect(fake.statements).toEqual([
      expect.objectContaining({
        id: "stmt-1",
        userId: "user-1",
        fileName: "test.csv",
        fileType: "CSV",
        status: "COMPLETED",
        periodStart: new Date("2026-03-01T00:00:00.000Z"),
        periodEnd: new Date("2026-03-05T00:00:00.000Z"),
        importedCount: 3,
        duplicateCount: 0,
        skippedCount: 1,
      }),
    ]);

    expect(fake.transactions).toEqual(
      ROWS.map((row, index) => ({
        userId: "user-1",
        statementId: "stmt-1",
        date: new Date(`${row.date}T00:00:00.000Z`),
        description: row.description,
        merchant: CATEGORIES[index].merchant,
        amountMinor: row.amountMinor,
        categoryId: CATEGORIES[index].categoryId,
        categorisedBy: CATEGORIES[index].categorisedBy,
        categoryLowConfidence: false,
        fingerprint: FINGERPRINTS[index],
      })),
    );
  });

  it("uses a longer transaction timeout", async () => {
    await importStatement(IDLE, importForm());
    expect(fake.transactionOptions).toEqual([{ timeout: 60_000 }]);
  });

  it("inserts in chunks of 1,000", async () => {
    const lines = [HEADER];
    for (let i = 0; i < 2_500; i++) {
      const day = String((i % 28) + 1).padStart(2, "0");
      lines.push(`${day}/03/2026,SHOP ${i},-1.00`);
    }
    const state = await importStatement(IDLE, importForm(undefined, csvFile(lines.join("\n"))));

    expect(state).toMatchObject({ status: "done", result: { importedCount: 2_500 } });
    expect(fake.createManyCalls).toBe(3);
    expect(fake.transactions).toHaveLength(2_500);
  });

  it("records the import and refreshes the views", async () => {
    await importStatement(IDLE, importForm());

    expect(fake.revalidated).toEqual(["/imports", "/transactions", "/dashboard"]);
    expect(fake.activity).toEqual([]); // only after the response
    for (const callback of fake.afterCallbacks) await callback();
    expect(fake.activity).toEqual([{ type: "STATEMENT_IMPORT", userId: "user-1" }]);
  });
});

describe("importStatement: categorising", () => {
  it("applies this user's merchant rules before built-in rules, loading them once", async () => {
    fake.merchantRules.push(
      userRule("fake grocer", "sys_groceries"),
      userRule("test cafe", "cat_my_treats"),
      { ...userRule("example payroll", "sys_gifts", "someone-else"), direction: "IN" },
    );

    const state = await importStatement(IDLE, importForm());

    expect(state).toMatchObject({
      status: "done",
      result: { importedCount: 3, categorisedCount: 3, needsReviewCount: 0 },
    });
    expect(fake.merchantRuleQueries).toBe(1);
    expect(
      fake.transactions.map(({ categoryId, categorisedBy }) => [categoryId, categorisedBy]),
    ).toEqual([
      ["sys_groceries", "USER"],
      ["sys_salary", "RULE"], // another user's rule is never used
      ["cat_my_treats", "USER"],
    ]);
  });

  it("keeps categories lined up with rows across insert chunks", async () => {
    const lines = [HEADER];
    for (let i = 0; i < 1_500; i++) {
      const description = i % 2 ? "NETFLIX.COM" : `MYSTERY ${i}`;
      lines.push(`01/03/2026,${description},-1.00`);
    }
    await importStatement(IDLE, importForm(undefined, csvFile(lines.join("\n"))));

    expect(fake.transactions).toHaveLength(1_500);
    for (const row of fake.transactions) {
      const expected = row.description === "NETFLIX.COM" ? "sys_subscriptions" : null;
      expect(row.categoryId).toBe(expected);
    }
  });
});

describe("importStatement: AI categorisation", () => {
  /** Two unknown merchants (one twice) plus the rows the rules already place. */
  const AI_CSV = [
    HEADER,
    "01/03/2026,FAKE GROCER,-12.50",
    "02/03/2026,FAKE GROCER,-8.00",
    "03/03/2026,ZQX HOLDINGS,-40.00",
    "04/03/2026,J SMITH,25.00",
    "05/03/2026,TEST CAFE,-3.20",
  ].join("\n");

  function aiImportForm() {
    return importForm(undefined, csvFile(AI_CSV));
  }

  it("fills what the rules can't place, counts it, and remembers the answers", async () => {
    fake.aiReply = () => [
      { merchantKey: "fake grocer", direction: "out", categoryId: "sys_groceries", confidence: "high" },
      { merchantKey: "j smith", direction: "in", categoryId: "sys_people_in", confidence: "low" },
      { merchantKey: "zqx holdings", direction: "out", categoryId: "unsure", confidence: "low" },
    ];

    const state = await importStatement(IDLE, aiImportForm());

    expect(state).toMatchObject({
      status: "done",
      result: {
        importedCount: 5,
        categorisedCount: 4,
        aiCategorisedCount: 3,
        lowConfidenceCount: 1,
        needsReviewCount: 1,
        needsReviewMerchantCount: 1,
      },
    });
    expect(fake.aiRequests).toBe(1);
    expect(
      fake.transactions.map((t) => [t.categoryId, t.categorisedBy, t.categoryLowConfidence]),
    ).toEqual([
      ["sys_groceries", "AI", false],
      ["sys_groceries", "AI", false],
      [null, null, false],
      ["sys_people_in", "AI", true],
      ["sys_eating_out", "RULE", false],
    ]);
    expect(fake.ruleCreateCalls).toEqual([
      {
        skipDuplicates: true,
        data: [
          { merchantKey: "fake grocer", direction: "OUT", categoryId: "sys_groceries", lowConfidence: false, userId: "user-1", source: "AI" },
          { merchantKey: "j smith", direction: "IN", categoryId: "sys_people_in", lowConfidence: true, userId: "user-1", source: "AI" },
        ],
      },
    ]);
  });

  it("still imports when the AI fails; those rows need review", async () => {
    const failure = new Error("FAKE GROCER leaked into a message");
    failure.name = "APIConnectionTimeoutError";
    fake.aiReply = () => failure;
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    const state = await importStatement(IDLE, aiImportForm());

    expect(state).toMatchObject({
      status: "done",
      result: {
        importedCount: 5,
        aiCategorisedCount: 0,
        needsReviewCount: 4,
        needsReviewMerchantCount: 3,
      },
    });
    expect(fake.transactions).toHaveLength(5);
    expect(fake.ruleCreateCalls).toEqual([]);
    expect(JSON.stringify(log.mock.calls)).not.toContain("FAKE GROCER");
    log.mockRestore();
  });

  it("still imports with no API key, making no request", async () => {
    const state = await importStatement(IDLE, aiImportForm());
    expect(state).toMatchObject({ status: "done", result: { importedCount: 5, aiCategorisedCount: 0 } });
    expect(fake.aiRequests).toBe(0);
  });

  it("uses a remembered AI answer instead of asking again", async () => {
    fake.aiReply = () => [];
    fake.merchantRules.push({
      ...userRule("fake grocer", "sys_groceries"),
      source: "AI",
      lowConfidence: true,
    });

    await importStatement(IDLE, importForm());

    expect(fake.aiRequests).toBe(0); // the other rows are placed by built-in rules
    expect(fake.transactions[0]).toMatchObject({
      categoryId: "sys_groceries",
      categorisedBy: "AI",
      categoryLowConfidence: true,
    });
  });

  it("never overwrites a USER rule, even one saved while the AI was answering", async () => {
    fake.aiReply = (sent) => {
      // The user sets a rule in another tab while this import waits on the AI
      fake.merchantRules.push(userRule("fake grocer", "cat_my_food"));
      return sent.map((item) => ({ ...item, categoryId: "sys_shopping", confidence: "high" as const }));
    };

    const state = await importStatement(IDLE, importForm());

    expect(state).toMatchObject({ status: "done" });
    expect(fake.merchantRules).toEqual([userRule("fake grocer", "cat_my_food")]);
  });

  it("never sends another user's rules or data, and loads rules for this user only", async () => {
    fake.merchantRules.push({ ...userRule("fake grocer", "sys_gifts", "someone-else"), source: "AI" });
    const sent: unknown[] = [];
    fake.aiReply = (items) => {
      sent.push(...items);
      return [];
    };

    await importStatement(IDLE, importForm());

    // Someone else's remembered answer isn't used: the merchant is asked about
    expect(sent).toEqual([{ merchantKey: "fake grocer", merchant: "Fake Grocer", direction: "out" }]);
  });
});

describe("importStatement: duplicates", () => {
  it("skips every flagged row when the user chose skip, and says so", async () => {
    alreadyImported(FINGERPRINTS[0]);

    const state = await importStatement(IDLE, importForm({ defaultChoice: "skip" }));

    expect(state).toMatchObject({
      status: "done",
      result: { importedCount: 2, duplicateCount: 1 },
    });
    expect(fake.transactions.map((row) => row.description)).toEqual([
      "EXAMPLE PAYROLL",
      "TEST CAFE",
    ]);
    expect(fake.statements[0]).toMatchObject({ importedCount: 2, duplicateCount: 1 });
  });

  it("saves nothing when every row is skipped", async () => {
    FINGERPRINTS.forEach((fp) => alreadyImported(fp));

    const state = await importStatement(IDLE, importForm({ defaultChoice: "skip" }));

    expect(state).toMatchObject({ status: "error", reason: "nothing_to_import" });
    expectNothingSaved();
    expect(fake.revalidated).toEqual([]);
    expect(fake.afterCallbacks).toEqual([]);
  });

  it("stops when a flagged row has no decision", async () => {
    alreadyImported(FINGERPRINTS[1]);

    const state = await importStatement(IDLE, importForm({ overrides: {} }));

    expect(state).toEqual({
      status: "error",
      reason: "needs_decision",
      message: "Something changed since the preview. Please check the file again.",
    });
    expectNothingSaved();
  });

  it("lets a per-row override win over the default", async () => {
    alreadyImported(FINGERPRINTS[0]);
    alreadyImported(FINGERPRINTS[2]);

    const state = await importStatement(
      IDLE,
      importForm({ defaultChoice: "skip", overrides: { [FINGERPRINTS[2]]: "import" } }),
    );

    expect(state).toMatchObject({
      status: "done",
      result: { importedCount: 2, duplicateCount: 1 },
    });
    expect(fake.transactions.map((row) => row.description)).toEqual([
      "EXAMPLE PAYROLL",
      "TEST CAFE",
    ]);
  });

  it("gives an import-anyway row a new fingerprint and keeps file order", async () => {
    alreadyImported(FINGERPRINTS[0]);

    const state = await importStatement(IDLE, importForm({ defaultChoice: "import" }));

    expect(state).toMatchObject({
      status: "done",
      result: { importedCount: 3, duplicateCount: 0 },
    });
    const saved = fake.transactions.map((row) => row.fingerprint);
    expect(saved[0]).not.toBe(FINGERPRINTS[0]);
    expect(saved[0]).toBe(hashFingerprint("row|2026-03-01|-1250|fake grocer", 1));
    expect(saved.slice(1)).toEqual(FINGERPRINTS.slice(1));
    expect(new Set(saved).size).toBe(3);
  });

  it("ignores another user's matching rows", async () => {
    FINGERPRINTS.forEach((fp) => alreadyImported(fp, "someone-else"));

    const state = await importStatement(IDLE, importForm({ overrides: {} }));

    expect(state).toMatchObject({ status: "done", result: { importedCount: 3 } });
  });
});

describe("importStatement: database errors", () => {
  it("asks to try again when two imports race (P2002), and saves nothing", async () => {
    fake.failCreateMany = new Prisma.PrismaClientKnownRequestError("unique", {
      code: "P2002",
      clientVersion: "test",
    });

    const state = await importStatement(IDLE, importForm());

    expect(state).toEqual({
      status: "error",
      reason: "conflict",
      message: "Please try again.",
    });
    expectNothingSaved();
    expect(fake.revalidated).toEqual([]);
  });

  it("logs only the error name for anything else", async () => {
    const error = new Error("contains FAKE GROCER -12.50");
    error.name = "SomethingBroke";
    fake.failCreateMany = error;
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    const state = await importStatement(IDLE, importForm());

    expect(state).toMatchObject({ status: "error", reason: "unexpected" });
    expect(log).toHaveBeenCalledWith("[imports] import failed:", "SomethingBroke");
    expect(JSON.stringify(log.mock.calls)).not.toContain("FAKE GROCER");
    log.mockRestore();
    expectNothingSaved();
  });
});
