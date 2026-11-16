import { describe, expect, it } from "vitest";
import { MAX_ROWS, readCsv } from "./csv";

function bytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function gridOf(text: string): string[][] {
  const result = readCsv(bytes(text));
  if (!result.ok) throw new Error(`readCsv failed: ${result.reason}`);
  return result.grid;
}

describe("readCsv", () => {
  it("reads rows and cells", () => {
    expect(gridOf("Date,Amount\n01/01/2026,-12.00\n")).toEqual([
      ["Date", "Amount"],
      ["01/01/2026", "-12.00"],
    ]);
  });

  it("keeps a comma inside quotes as part of the cell", () => {
    expect(gridOf('Name,Notes\nShop,"Bread, milk"\n')).toEqual([
      ["Name", "Notes"],
      ["Shop", "Bread, milk"],
    ]);
  });

  it("reads a doubled quote as one quote character", () => {
    expect(gridOf('Name\n"The ""Best"" Cafe"\n')).toEqual([
      ["Name"],
      ['The "Best" Cafe'],
    ]);
  });

  it("handles Windows line endings", () => {
    expect(gridOf("Date,Amount\r\n01/01/2026,5.00\r\n")).toEqual([
      ["Date", "Amount"],
      ["01/01/2026", "5.00"],
    ]);
  });

  it("removes the byte-order mark from the first cell", () => {
    expect(gridOf("\uFEFFDate,Amount\n")[0]).toEqual(["Date", "Amount"]);
  });

  it("works out the separator when it isn't a comma", () => {
    expect(gridOf("Date;Amount\n01/01/2026;5.00\n")).toEqual([
      ["Date", "Amount"],
      ["01/01/2026", "5.00"],
    ]);
  });

  it("skips blank lines and trims cells", () => {
    expect(gridOf("Date, Amount \n\n , \n01/01/2026 ,5.00\n")).toEqual([
      ["Date", "Amount"],
      ["01/01/2026", "5.00"],
    ]);
  });

  it("keeps emoji", () => {
    expect(gridOf("Name,Emoji\nTrain,🚆\n")[1]).toEqual(["Train", "🚆"]);
  });

  it("reads a pound sign from an older Windows-encoded file", () => {
    // The bytes for "A,B", a new line, then "£5,x" in Windows-1252
    const windows1252 = new Uint8Array([
      0x41, 0x2c, 0x42, 0x0a, 0xa3, 0x35, 0x2c, 0x78, 0x0a,
    ]);

    expect(readCsv(windows1252)).toEqual({
      ok: true,
      grid: [
        ["A", "B"],
        ["£5", "x"],
      ],
    });
  });

  it("rejects a binary file", () => {
    const binary = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x00, 0x01]);
    expect(readCsv(binary)).toEqual({ ok: false, reason: "not_text" });
  });

  it("rejects a file with no rows", () => {
    expect(readCsv(bytes(""))).toEqual({ ok: false, reason: "empty" });
    expect(readCsv(bytes("\n\n  \n"))).toEqual({ ok: false, reason: "empty" });
  });

  it("rejects a file with too many rows", () => {
    const big = "a,b\n".repeat(MAX_ROWS + 1);
    expect(readCsv(bytes(big))).toEqual({ ok: false, reason: "too_many_rows" });
  });
});