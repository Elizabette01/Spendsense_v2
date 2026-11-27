import { describe, expect, it } from "vitest";

import {
  formatDay,
  formatMoney,
  formatMoneyAbs,
  formatMonthYear,
  formatPeriod,
  ordinal,
  plural,
} from "./format";

describe("formatMoney", () => {
  it.each([
    [0, "£0.00"],
    [1250, "£12.50"],
    [-1250, "-£12.50"],
    [123_456_789, "£1,234,567.89"],
    [5, "£0.05"],
  ])("%i pence → %s", (minor, expected) => {
    expect(formatMoney(minor)).toBe(expected);
  });

  it("drops the sign for totals", () => {
    expect(formatMoneyAbs(-1250)).toBe("£12.50");
  });
});

describe("dates", () => {
  it("reads calendar days as UTC, whatever the local time zone", () => {
    expect(formatDay("2026-04-01")).toBe("1 Apr 2026");
    expect(formatDay(new Date("2026-04-11T00:00:00.000Z"))).toBe("11 Apr 2026");
    expect(formatMonthYear("2026-04-30")).toBe("April 2026");
  });

  it.each([
    ["2026-04-01", "2026-04-30", "April 2026"],
    ["2026-05-01", "2026-10-31", "May to October 2026"],
    ["2025-12-01", "2026-01-31", "December 2025 to January 2026"],
  ])("period %s to %s → %s", (start, end, expected) => {
    expect(formatPeriod(start, end)).toBe(expected);
  });

  it("has no period without dates", () => {
    expect(formatPeriod(null, "2026-04-30")).toBeNull();
  });
});

describe("plural", () => {
  it("picks the right word", () => {
    expect(plural(1, "transaction")).toBe("1 transaction");
    expect(plural(1420, "transaction")).toBe("1,420 transactions");
    expect(plural(0, "row")).toBe("0 rows");
  });
});

describe("ordinal", () => {
  it.each([
    [1, "1st"], [2, "2nd"], [3, "3rd"], [4, "4th"], [11, "11th"], [12, "12th"],
    [13, "13th"], [21, "21st"], [22, "22nd"], [23, "23rd"], [31, "31st"],
  ])("%i → %s", (day, expected) => {
    expect(ordinal(day)).toBe(expected);
  });
});
