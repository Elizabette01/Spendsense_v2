import Papa from "papaparse";
import type { Grid, ReadResult } from "./types";

export const MAX_ROWS = 20_000;

/** Turns a file's bytes into text, or null if it isn't a text file. */
export function decodeText(bytes: Uint8Array): string | null {
  // UTF-16 files announce themselves with a two-byte mark
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes);
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(bytes);
  }

  // A zero byte never appears in ordinary text: this is a binary file
  if (bytes.includes(0)) return null;

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    // Not valid UTF-8: older exports use the Windows Western European set
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

/** Reads a CSV file into a grid of trimmed text cells. */
export function readCsv(bytes: Uint8Array): ReadResult {
  const text = decodeText(bytes);
  if (text === null) return { ok: false, reason: "not_text" };

  const parsed = Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: "greedy",
  });

  const grid: Grid = parsed.data.map((row) => row.map((cell) => cell.trim()));

  if (grid.length === 0) return { ok: false, reason: "empty" };
  if (grid.length > MAX_ROWS) return { ok: false, reason: "too_many_rows" };

  return { ok: true, grid };
}