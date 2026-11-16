import "server-only";

import { analyseGrid, type Analysis, type AnalyseOptions } from "../parsers/analyse";
import { readCsv } from "../parsers/csv";
import { readExcel } from "../parsers/excel";
import { sniffFileKind, type FileKind } from "../parsers/filetype";
import { readPdfText, type PdfFailure } from "../parsers/pdf";
import { analysePdfText, type PdfAnalysis } from "../parsers/pdfStatement";
import type { Grid, ReadFailure } from "../parsers/types";

export const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_FILE_NAME_LENGTH = 255;

export type StatementFileType = "CSV" | "XLSX" | "XLS" | "PDF";

export type StatementReadFailure =
  | "too_large"
  | "wrong_file_type"
  | ReadFailure
  | PdfFailure;

export type StatementRead =
  | { ok: false; reason: StatementReadFailure }
  | {
      ok: true;
      kind: "grid";
      fileName: string;
      fileType: "CSV" | "XLSX" | "XLS";
      grid: Grid;
      analysis: Analysis;
    }
  | {
      ok: true;
      kind: "pdf";
      fileName: string;
      fileType: "PDF";
      analysis: PdfAnalysis;
    };

const ACCEPTED = new Map<
  string,
  { fileType: StatementFileType; kinds: readonly FileKind[] }
>([
  ["csv", { fileType: "CSV", kinds: ["text"] }],
  ["xlsx", { fileType: "XLSX", kinds: ["xlsx"] }],
  ["xls", { fileType: "XLS", kinds: ["xls", "markup", "text"] }],
  ["pdf", { fileType: "PDF", kinds: ["pdf"] }],
]);

/** Makes a browser-supplied file name safe to store and show. */
export function cleanFileName(raw: string): string {
  const base = raw.split(/[\\/]/).pop() ?? "";
  const cleaned = base
    .replace(/\p{Cc}/gu, "")
    .trim()
    .slice(-MAX_FILE_NAME_LENGTH);
  return cleaned || "statement";
}

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot + 1).toLowerCase();
}

/** Checks, reads and analyses an uploaded statement. Holds nothing afterwards. */
export async function readStatement(input: {
  fileName: string;
  bytes: Uint8Array;
  options?: AnalyseOptions;
}): Promise<StatementRead> {
  const { bytes, options } = input;

  // 1. Size
  if (bytes.length === 0) return { ok: false, reason: "empty" };
  if (bytes.length > MAX_FILE_BYTES) return { ok: false, reason: "too_large" };

  // 2. File name
  const fileName = cleanFileName(input.fileName);

  // 3. The extension and the real contents must agree
  const rule = ACCEPTED.get(extensionOf(fileName));
  if (!rule || !rule.kinds.includes(sniffFileKind(bytes))) {
    return { ok: false, reason: "wrong_file_type" };
  }
  const { fileType } = rule;

  // 4. PDF: text, then rows
  if (fileType === "PDF") {
    const pdf = await readPdfText(bytes);
    if (!pdf.ok) return { ok: false, reason: pdf.reason };
    return {
      ok: true,
      kind: "pdf",
      fileName,
      fileType,
      analysis: analysePdfText(pdf.text),
    };
  }

  // 5. CSV and Excel: grid, then columns and rows
  const read = fileType === "CSV" ? readCsv(bytes) : readExcel(bytes);
  if (!read.ok) return { ok: false, reason: read.reason };
  return {
    ok: true,
    kind: "grid",
    fileName,
    fileType,
    grid: read.grid,
    analysis: analyseGrid(read.grid, options ?? {}),
  };
}