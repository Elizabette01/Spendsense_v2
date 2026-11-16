import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { analyseGrid } from "./analyse";
import { MAX_ROWS } from "./csv";
import { parseDate } from "./dates";
import { readExcel } from "./excel";
import { parseMoneyToMinor } from "./money";
import type { ReadResult } from "./types";

function workbookBytes(
  rows: unknown[][],
  bookType: XLSX.BookType,
  edit?: (sheet: XLSX.WorkSheet) => void,
): Uint8Array {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  edit?.(sheet);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Statement");
  return new Uint8Array(XLSX.write(book, { type: "array", bookType }));
}

function gridOf(result: ReadResult): string[][] {
  if (!result.ok) throw new Error(`readExcel failed: ${result.reason}`);
  return result.grid;
}

describe("readExcel", () => {
  it("reads an .xlsx file into rows of text", () => {
    const grid = gridOf(
      readExcel(
        workbookBytes(
          [
            ["Date", "Description", "Amount"],
            ["15/01/2026", "CORNER SHOP", -4.5],
          ],
          "xlsx",
        ),
      ),
    );

    expect(grid[0]).toEqual(["Date", "Description", "Amount"]);
    expect(grid[1][0]).toBe("15/01/2026");
    expect(grid[1][1]).toBe("CORNER SHOP");
    expect(parseMoneyToMinor(grid[1][2])).toBe(-450);
  });

  it("reads an old-style .xls file", () => {
    const grid = gridOf(
      readExcel(
        workbookBytes(
          [
            ["Date", "Description", "Amount"],
            ["15/01/2026", "CORNER SHOP", "-4.50"],
          ],
          "biff8",
        ),
      ),
    );

    expect(grid[1]).toEqual(["15/01/2026", "CORNER SHOP", "-4.50"]);
  });

  it("turns a real Excel date into yyyy-mm-dd, whatever its display format", () => {
    // 46027 is Excel's serial number for 5 January 2026
    const bytes = workbookBytes(
      [["Date"], [0], [0]],
      "xlsx",
      (sheet) => {
        sheet.A2 = { t: "n", v: 46027, z: "dd/mm/yyyy" };
        sheet.A3 = { t: "n", v: 46027, z: "m/d/yy" };
      },
    );

    const grid = gridOf(readExcel(bytes));
    expect(grid[1][0]).toBe("2026-01-05");
    expect(grid[2][0]).toBe("2026-01-05");
  });

  it("shows amounts the way Excel displays them", () => {
    const bytes = workbookBytes([["Amount"], [0]], "xlsx", (sheet) => {
      sheet.A2 = { t: "n", v: 1500, z: "#,##0.00" };
    });

    const grid = gridOf(readExcel(bytes));
    expect(parseMoneyToMinor(grid[1][0])).toBe(150000);
  });

  it("keeps text dates in a web page saved as .xls as text", () => {
    const html =
      "<html><body><table>" +
      "<tr><td>Date</td><td>Description</td><td>Amount</td></tr>" +
      "<tr><td>01-09-2026</td><td>CORNER SHOP</td><td>-4.50</td></tr>" +
      "</table></body></html>";

    const grid = gridOf(readExcel(new TextEncoder().encode(html)));
    expect(grid[1][1]).toBe("CORNER SHOP");
    expect(parseDate(grid[1][0])).toBe("2026-09-01");
    expect(parseMoneyToMinor(grid[1][2])).toBe(-450);
  });

  it("rejects a workbook with no data", () => {
    expect(readExcel(workbookBytes([], "xlsx"))).toEqual({
      ok: false,
      reason: "empty",
    });
  });

  it("rejects a file that only looks like a spreadsheet", () => {
    const fakeZip = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0, 0, 0]);
    const result = readExcel(fakeZip);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(["not_spreadsheet", "empty"]).toContain(result.reason);
    }
  });

  it("rejects a sheet with too many rows", () => {
    const rows = Array.from({ length: MAX_ROWS + 5 }, (_, i) => [
      "15/01/2026",
      `ROW ${i}`,
      "-1.00",
    ]);

    expect(readExcel(workbookBytes(rows, "xlsx"))).toEqual({
      ok: false,
      reason: "too_many_rows",
    });
  });

  it("feeds the same pipeline as CSV", () => {
    const bytes = workbookBytes(
      [
        ["Transaction Date", "Transaction Type", "Sort Code", "Account Number", "Transaction Description", "Debit Amount", "Credit Amount", "Balance"],
        ["15/01/2026", "DEB", "'00-00-00", "00000000", "CORNER SHOP", "4.50", "", "95.50"],
        ["16/01/2026", "DEB", "'00-00-00", "00000000", "BUS FARE", "1.75", "", "93.75"],
        ["25/01/2026", "FPI", "'00-00-00", "00000000", "EMPLOYER LTD", "", "1500.00", "1593.75"],
      ],
      "xlsx",
    );

    const result = analyseGrid(gridOf(readExcel(bytes)));
    expect(result.failure).toBeNull();
    expect(result.bank?.id).toBe("lloyds");
    expect(result.normalised.rows.map((r) => r.amountMinor)).toEqual([
      -450, -175, 150000,
    ]);
  });
});