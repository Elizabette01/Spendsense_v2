import "pdf-parse/worker";
import { InvalidPDFException, PasswordException, PDFParse } from "pdf-parse";

export const MAX_PAGES = 50;

export type PdfFailure = "not_pdf" | "password_protected" | "too_many_pages" | "no_text";

export type PdfTextResult =
  | { ok: true; text: string; pages: number }
  | { ok: false; reason: PdfFailure };

/** Pulls the text out of a PDF, one line of text per printed line. */
export async function readPdfText(bytes: Uint8Array): Promise<PdfTextResult> {
  // pdf-parse may take ownership of the bytes it's given, so hand it a copy
  const parser = new PDFParse({ data: new Uint8Array(bytes) });
  try {
    const result = await parser.getText({ first: MAX_PAGES + 1, pageJoiner: "" });
    if (result.total > MAX_PAGES) return { ok: false, reason: "too_many_pages" };

    const text = result.text.replace(/[ \t]+/g, " ");
    if (text.replace(/\s/g, "").length < 20) return { ok: false, reason: "no_text" };
    return { ok: true, text, pages: result.total };
  } catch (error) {
    if (error instanceof PasswordException) return { ok: false, reason: "password_protected" };
    if (error instanceof InvalidPDFException) return { ok: false, reason: "not_pdf" };
    return { ok: false, reason: "not_pdf" };
  } finally {
    await parser.destroy();
  }
}