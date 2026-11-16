import { PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, it, vi } from "vitest";

import { MAX_FILE_BYTES, cleanFileName, readStatement } from "./read-statement";

vi.mock("server-only", () => ({}));

const encode = (text: string) => new TextEncoder().encode(text);

const CSV = encode(
  [
    "Date,Description,Amount",
    "01/03/2026,TESCO STORES,-12.50",
    "02/03/2026,SALARY,1000.00",
    "03/03/2026,COFFEE SHOP,-3.20",
  ].join("\n"),
);

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

describe("cleanFileName", () => {
  it.each([
    ["C:\\Users\\me\\march.csv", "march.csv"],
    ["/home/me/march.csv", "march.csv"],
    ["  march.csv  ", "march.csv"],
    ["mar\u0000ch\n.csv", "march.csv"],
  ])("cleans %j", (raw, expected) => {
    expect(cleanFileName(raw)).toBe(expected);
  });

  it("falls back to a default when nothing is left", () => {
    expect(cleanFileName("   ")).toBe("statement");
  });

  it("shortens a long name but keeps the extension", () => {
    const cleaned = cleanFileName(`${"a".repeat(300)}.csv`);
    expect(cleaned).toHaveLength(255);
    expect(cleaned.endsWith(".csv")).toBe(true);
  });
});

describe("readStatement", () => {
  it("rejects an empty file", async () => {
    const result = await readStatement({
      fileName: "march.csv",
      bytes: new Uint8Array(0),
    });
    expect(result).toEqual({ ok: false, reason: "empty" });
  });

  it("rejects a file over the size cap", async () => {
    const result = await readStatement({
      fileName: "march.csv",
      bytes: new Uint8Array(MAX_FILE_BYTES + 1),
    });
    expect(result).toEqual({ ok: false, reason: "too_large" });
  });

  it.each(["notes.txt", "march", "x.constructor"])(
    "rejects the file name %s",
    async (fileName) => {
      const result = await readStatement({ fileName, bytes: CSV });
      expect(result).toEqual({ ok: false, reason: "wrong_file_type" });
    },
  );

  it("rejects a PDF renamed to .csv", async () => {
    const bytes = await makePdf(["Barclays Bank statement"]);
    const result = await readStatement({ fileName: "march.csv", bytes });
    expect(result).toEqual({ ok: false, reason: "wrong_file_type" });
  });

  it("rejects a CSV renamed to .pdf", async () => {
    const result = await readStatement({ fileName: "march.pdf", bytes: CSV });
    expect(result).toEqual({ ok: false, reason: "wrong_file_type" });
  });

  it("reads a CSV statement", async () => {
    const result = await readStatement({
      fileName: "C:\\bank\\MARCH.CSV",
      bytes: CSV,
    });
    if (!result.ok || result.kind !== "grid") {
      throw new Error("expected a grid result");
    }
    expect(result.fileName).toBe("MARCH.CSV");
    expect(result.fileType).toBe("CSV");
    expect(result.grid[0]).toEqual(["Date", "Description", "Amount"]);
    expect(result.analysis.failure).toBeNull();
    expect(result.analysis.normalised.rows).toHaveLength(3);
  });

  it("reads a PDF statement", async () => {
    const bytes = await makePdf([
      "Barclays Bank statement",
      "01/03/2026 TESCO STORES 12.50 987.50",
    ]);
    const result = await readStatement({ fileName: "march.pdf", bytes });
    if (!result.ok || result.kind !== "pdf") {
      throw new Error("expected a pdf result");
    }
    expect(result.fileType).toBe("PDF");
    expect(result.fileName).toBe("march.pdf");
  });
});