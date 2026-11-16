import { PDFDocument, StandardFonts } from "pdf-lib";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { addFingerprints } from "../parsers/fingerprint";
import { previewStatement, type PreviewState } from "./preview-statement";

const fake = vi.hoisted(() => ({
  userId: "user-1" as string | null,
  allowed: true,
  rateKeys: [] as string[],
  /** `${userId}|${fingerprint}` already in the database */
  stored: new Set<string>(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/auth", () => ({
  auth: async () => (fake.userId ? { user: { id: fake.userId } } : null),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { previewStatementUser: { limit: 30, windowSeconds: 3600 } },
  rateLimit: async (key: string) => {
    fake.rateKeys.push(key);
    return { allowed: fake.allowed, remaining: 0, resetAt: new Date() };
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    transaction: {
      findMany: async ({
        where,
      }: {
        where: { userId: string; fingerprint: { in: string[] } };
      }) =>
        where.fingerprint.in
          .filter((fp) => fake.stored.has(`${where.userId}|${fp}`))
          .map((fingerprint) => ({ fingerprint })),
    },
  },
}));

// All data below is invented.
const CSV = [
  "Date,Description,Amount",
  "01/03/2026,FAKE GROCER,-12.50",
  "02/03/2026,EXAMPLE PAYROLL,1000.00",
  "03/03/2026,TEST CAFE,-3.20",
].join("\n");

const IDLE: PreviewState = { status: "idle" };

function form(fields: Record<string, string | File>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

function csvFile(text = CSV, name = "test.csv"): File {
  return new File([text], name, { type: "text/csv" });
}

async function pdfFile(lines: string[]): Promise<File> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage();
  let y = page.getHeight() - 50;
  for (const line of lines) {
    page.drawText(line, { x: 50, y, size: 11, font });
    y -= 16;
  }
  const bytes = await doc.save();
  return new File([new Uint8Array(bytes)], "test.pdf", { type: "application/pdf" });
}

beforeEach(() => {
  fake.userId = "user-1";
  fake.allowed = true;
  fake.rateKeys.length = 0;
  fake.stored.clear();
});

describe("previewStatement", () => {
  it("asks a signed-out user to sign in", async () => {
    fake.userId = null;
    const state = await previewStatement(IDLE, form({ file: csvFile() }));
    expect(state).toMatchObject({ status: "error", reason: "signed_out" });
    expect(fake.rateKeys).toEqual([]);
  });

  it("rate limits per user", async () => {
    fake.allowed = false;
    const state = await previewStatement(IDLE, form({ file: csvFile() }));
    expect(state).toMatchObject({ status: "error", reason: "rate_limited" });
    expect(fake.rateKeys).toEqual(["preview:user:user-1"]);
  });

  it("rejects a missing file", async () => {
    const state = await previewStatement(IDLE, form({}));
    expect(state).toMatchObject({ status: "error", reason: "invalid_input" });
  });

  it.each([
    ["mapping that isn't JSON", { mapping: "{nope" }],
    ["a mapping that uses a column twice", { mapping: '{"date":0,"amount":0}' }],
    ["an unknown date order", { dateOrder: "ymd" }],
  ])("rejects %s", async (_label, extra) => {
    const state = await previewStatement(
      IDLE,
      form({ file: csvFile(), ...extra }),
    );
    expect(state).toMatchObject({ status: "error", reason: "invalid_input" });
  });

  it("rejects the wrong file type", async () => {
    const state = await previewStatement(
      IDLE,
      form({ file: csvFile(CSV, "notes.txt") }),
    );
    expect(state).toMatchObject({ status: "error", reason: "wrong_file_type" });
  });

  it("rejects a file that isn't a bank statement", async () => {
    const file = await pdfFile([
      "Shopping list for the weekend",
      "Apples, pears, bread, milk and some invented things",
    ]);
    const state = await previewStatement(IDLE, form({ file }));
    expect(state).toMatchObject({ status: "error", reason: "not_a_statement" });
  });

  it("still previews a file that only needs a column chosen", async () => {
    const noAmount = ["Date,Description", "01/03/2026,FAKE GROCER"].join("\n");
    const state = await previewStatement(IDLE, form({ file: csvFile(noAmount) }));
    if (state.status !== "ready") throw new Error(`expected ready, got ${state.status}`);
    expect(state.preview.columns?.needsMapping).toBe("no_amount_column");
  });

  it("previews a statement and flags rows already imported", async () => {
    const [, payroll] = addFingerprints(
      [
        { rowNumber: 2, date: "2026-03-01", amountMinor: -1250, description: "FAKE GROCER", externalId: null },
        { rowNumber: 3, date: "2026-03-02", amountMinor: 100_000, description: "EXAMPLE PAYROLL", externalId: null },
      ],
      null,
    );
    fake.stored.add(`user-1|${payroll.fingerprint}`);
    fake.stored.add(`someone-else|${payroll.fingerprint}`);

    const state = await previewStatement(IDLE, form({ file: csvFile() }));

    if (state.status !== "ready") throw new Error(`expected ready, got ${state.status}`);
    expect(state.preview.summary.rowCount).toBe(3);
    expect(state.preview.flagged.map((row) => row.description)).toEqual([
      "EXAMPLE PAYROLL",
    ]);
  });
});
