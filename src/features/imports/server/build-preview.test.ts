import { PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, it, vi } from "vitest";

import { addFingerprints, hashFingerprint } from "../parsers/fingerprint";
import { buildPreview } from "./build-preview";
import { flagDuplicates } from "./duplicates";
import { readStatement } from "./read-statement";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: {} }));

// All data below is invented.
const encode = (text: string) => new TextEncoder().encode(text);

async function readCsv(lines: string[]) {
  const read = await readStatement({
    fileName: "test.csv",
    bytes: encode(lines.join("\n")),
  });
  if (!read.ok) throw new Error(`expected ok, got ${read.reason}`);
  return read;
}

async function preview(lines: string[], existing: Set<string> = new Set()) {
  const read = await readCsv(lines);
  const rows = addFingerprints(read.analysis.normalised.rows, null);
  return buildPreview(read, flagDuplicates(rows, existing));
}

const SMALL = [
  "Date,Description,Amount",
  "03/03/2026,FAKE GROCER,-12.50",
  "01/03/2026,EXAMPLE PAYROLL,1000.00",
  "15/03/2026,TEST CAFE,-3.20",
  "10/03/2026,ZERO ROW,0.00",
];

async function makePdf(lines: string[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage();
  let y = page.getHeight() - 50;
  for (const line of lines) {
    page.drawText(line, { x: 50, y, size: 11, font });
    y -= 16;
  }
  return doc.save();
}

describe("buildPreview", () => {
  it("totals money in and money out separately, in pence", async () => {
    const result = await preview(SMALL);
    expect(result.summary.moneyInMinor).toBe(100_000);
    expect(result.summary.moneyOutMinor).toBe(1_570);
  });

  it("counts rows and skipped zero-amount rows", async () => {
    const result = await preview(SMALL);
    expect(result.summary.rowCount).toBe(3);
    expect(result.summary.skippedZero).toBe(1);
  });

  it("reports the earliest and latest dates, whatever the file order", async () => {
    const result = await preview(SMALL);
    expect(result.summary.dateFrom).toBe("2026-03-01");
    expect(result.summary.dateTo).toBe("2026-03-15");
  });

  it("caps the sample at 20 rows", async () => {
    const lines = ["Date,Description,Amount"];
    for (let day = 1; day <= 28; day++) {
      lines.push(`${String(day).padStart(2, "0")}/02/2026,SHOP ${day},-1.00`);
    }
    const result = await preview(lines);
    expect(result.summary.rowCount).toBe(28);
    expect(result.sample).toHaveLength(20);
    expect(result.sample[0].description).toBe("SHOP 1");
  });

  it("lists rows that match an earlier upload, with their fingerprint", async () => {
    const read = await readCsv(SMALL);
    const rows = addFingerprints(read.analysis.normalised.rows, null);
    const existing = new Set([rows[1].fingerprint]);

    const result = buildPreview(read, flagDuplicates(rows, existing));

    expect(result.flagged).toHaveLength(1);
    expect(result.flagged[0]).toMatchObject({
      description: "EXAMPLE PAYROLL",
      fingerprint: rows[1].fingerprint,
      matchedBy: "content",
    });
    // Flagged rows stay in the totals: nothing is removed by flagging
    expect(result.summary.rowCount).toBe(3);
  });

  it("flags nothing when nothing matches", async () => {
    const result = await preview(SMALL, new Set([hashFingerprint("x", 0)]));
    expect(result.flagged).toEqual([]);
  });

  it("hides sort code and account number samples", async () => {
    const result = await preview([
      "Date,Description,Amount,Sort Code,Account Number",
      "01/03/2026,FAKE GROCER,-12.50,00-00-00,00000000",
      "02/03/2026,TEST CAFE,-3.20,00-00-00,00000000",
    ]);
    const items = result.columns?.items ?? [];
    const sortCode = items.find((item) => item.header === "Sort Code");
    const account = items.find((item) => item.header === "Account Number");
    const description = items.find((item) => item.header === "Description");

    expect(sortCode).toMatchObject({ sampleHidden: true, sample: null });
    expect(account).toMatchObject({ sampleHidden: true, sample: null });
    expect(description).toMatchObject({ sampleHidden: false, sample: "FAKE GROCER" });
  });

  it("describes the detected columns for a grid file", async () => {
    const result = await preview(SMALL);
    expect(result.columns?.items.map((item) => item.role)).toEqual([
      "date",
      "description",
      "amount",
    ]);
    expect(result.columns?.needsMapping).toBeNull();
  });

  it("has no columns for a PDF", async () => {
    const bytes = await makePdf([
      "Barclays Bank statement",
      "01/03/2026 FAKE GROCER 12.50 987.50",
    ]);
    const read = await readStatement({ fileName: "test.pdf", bytes });
    if (!read.ok) throw new Error(`expected ok, got ${read.reason}`);
    const rows = addFingerprints(read.analysis.normalised.rows, null);

    const result = buildPreview(read, flagDuplicates(rows, new Set()));

    expect(result.columns).toBeNull();
    expect(result.fileType).toBe("PDF");
    expect(result.bankName).toBe("Barclays");
    expect(result.summary.balance).toBeNull();
  });
});
