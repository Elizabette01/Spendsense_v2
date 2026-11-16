import { describe, expect, it } from "vitest";
import { isoDateToUtcDate, parseDate } from "./dates";

describe("parseDate", () => {
  it.each([
    ["01/02/2026", "2026-02-01"],
    ["1/2/26", "2026-02-01"],
    ["31-12-2025", "2025-12-31"],
    ["31.12.2025", "2025-12-31"],
    ["2026-01-31", "2026-01-31"],
    ["2026-01-31T10:00:00Z", "2026-01-31"],
    ["15 Mar 2026", "2026-03-15"],
    ["15-Mar-26", "2026-03-15"],
    ["3 September 2026", "2026-09-03"],
    ["29/02/2024", "2024-02-29"],
  ])("reads %j as %s", (input, expected) => {
    expect(parseDate(input)).toBe(expected);
  });

  it.each(["", "hello", "31/02/2026", "29/02/2026", "13/13/2026", "15 Xyz 2026"])(
    "returns null for %j",
    (input) => {
      expect(parseDate(input)).toBeNull();
    },
  );

    it("reads month-first dates when told to", () => {
    expect(parseDate("02/01/2026", "mdy")).toBe("2026-02-01");
    expect(parseDate("01/25/2026", "mdy")).toBe("2026-01-25");
  });

  it("rejects a month-first date read as day-first", () => {
    expect(parseDate("01/25/2026")).toBeNull();
  });
});

describe("isoDateToUtcDate", () => {
  it("gives midnight UTC on that day", () => {
    expect(isoDateToUtcDate("2026-01-31").toISOString()).toBe(
      "2026-01-31T00:00:00.000Z",
    );
  });
});