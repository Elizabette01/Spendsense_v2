import { PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { MAX_PAGES, readPdfText } from "./pdf";
import { analysePdfText } from "./pdfStatement";

/** Builds a real PDF: each line is a list of [text, x position] pieces. */
async function makePdf(pages: [string, number][][][]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const lines of pages) {
    const page = doc.addPage([595, 842]);
    let y = 800;
    for (const line of lines) {
      for (const [text, x] of line) page.drawText(text, { x, y, size: 10, font });
      y -= 16;
    }
  }
  return doc.save();
}

describe("readPdfText", () => {
  it("reads a statement laid out in columns, one row per line", async () => {
    const bytes = await makePdf([
      [
        [["Lloyds Bank plc", 40]],
        [["Statement 1 January 2026 to 31 January 2026", 40]],
        [["Date", 40], ["Description", 110], ["Money out", 330], ["Money in", 410], ["Balance", 490]],
        [["01 Jan 26", 40], ["Balance brought forward", 110], ["100.00", 490]],
        [["05 Jan 26", 40], ["CORNER SHOP", 110], ["4.50", 330], ["95.50", 490]],
        [["25 Jan 26", 40], ["EMPLOYER LTD", 110], ["1,500.00", 410], ["1,595.50", 490]],
      ],
    ]);

    const result = await readPdfText(bytes);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const analysis = analysePdfText(result.text);
    expect(analysis.bank).toBe("lloyds");
    expect(analysis.failure).toBeNull();
    expect(analysis.normalised.rows.map((r) => r.amountMinor)).toEqual([-450, 150000]);
  });

  it("reads every page", async () => {
    const bytes = await makePdf([
      [[["Monzo Bank Limited statement", 40]], [["15/01/2026", 40], ["CORNER SHOP", 110], ["-4.50", 400]]],
      [[["16/01/2026", 40], ["BUS FARE", 110], ["-1.75", 400]]],
    ]);

    const result = await readPdfText(bytes);
    expect(result.ok && result.pages).toBe(2);
    if (!result.ok) return;
    expect(analysePdfText(result.text).normalised.rows.map((r) => r.amountMinor)).toEqual([-450, -175]);
  });

  it("rejects a file that isn't a PDF", async () => {
    expect(await readPdfText(new TextEncoder().encode("Date,Amount\n"))).toEqual({
      ok: false,
      reason: "not_pdf",
    });
  });

  it("rejects a PDF with no text, such as a scan", async () => {
    expect(await readPdfText(await makePdf([[]]))).toEqual({ ok: false, reason: "no_text" });
  });

  it("rejects a PDF with too many pages", async () => {
    const pages = Array.from({ length: MAX_PAGES + 1 }, () => [[["Statement page", 40]]] as [string, number][][]);
    expect(await readPdfText(await makePdf(pages))).toEqual({ ok: false, reason: "too_many_pages" });
  });
});