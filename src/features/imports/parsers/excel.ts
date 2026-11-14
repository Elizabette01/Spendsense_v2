import * as XLSX from "xlsx";
import { MAX_ROWS } from "./csv";
import type { Grid, ReadResult } from "./types";

const MAX_COLUMNS = 100;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** One cell as text, with dates turned into "yyyy-mm-dd". */
function cellText(cell: XLSX.CellObject | undefined, date1904: boolean): string {
  if (!cell) return "";

  if (cell.t === "n") {
    const isDate =
      typeof cell.v === "number" &&
      typeof cell.z === "string" &&
      XLSX.SSF.is_date(cell.z);
    if (isDate) {
      const parts = XLSX.SSF.parse_date_code(cell.v as number, { date1904 });
      if (parts) return `${parts.y}-${pad(parts.m)}-${pad(parts.d)}`;
    }
    return (cell.w ?? String(cell.v ?? "")).trim();
  }
  if (cell.t === "s") return String(cell.v ?? "").trim();
  if (cell.t === "b") return cell.v ? "TRUE" : "FALSE";
  return "";
}

function sheetToGrid(sheet: XLSX.WorkSheet, date1904: boolean): Grid {
  const ref = sheet["!ref"];
  if (!ref) return [];

  const range = XLSX.utils.decode_range(ref);
  const lastColumn = Math.min(range.e.c, range.s.c + MAX_COLUMNS - 1);
  const grid: Grid = [];

  for (let r = range.s.r; r <= range.e.r; r++) {
    const line: string[] = [];
    for (let c = range.s.c; c <= lastColumn; c++) {
      const address = XLSX.utils.encode_cell({ r, c });
      line.push(cellText(sheet[address] as XLSX.CellObject | undefined, date1904));
    }
    while (line.length > 0 && line[line.length - 1] === "") line.pop();
    if (line.length > 0) grid.push(line);
  }
  return grid;
}

/** Reads the first sheet with any data into a grid of text cells. */
export function readExcel(bytes: Uint8Array): ReadResult {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(bytes, {
      type: "array",
      raw: true,
      cellNF: true,
      sheetRows: MAX_ROWS + 1,
    });
  } catch {
    return { ok: false, reason: "not_spreadsheet" };
  }

  const flag: unknown = workbook.Workbook?.WBProps?.date1904;
  const date1904 = flag === true || flag === "1" || flag === "true";

  for (const name of workbook.SheetNames) {
    const grid = sheetToGrid(workbook.Sheets[name], date1904);
    if (grid.length > MAX_ROWS) return { ok: false, reason: "too_many_rows" };
    if (grid.length > 0) return { ok: true, grid };
  }
  return { ok: false, reason: "empty" };
}