import { describe, expect, it } from "vitest";
import { parseMoneyToMinor } from "./money";

describe("parseMoneyToMinor", () => {
  it.each([
    ["12.34", 1234],
    ["-12.34", -1234],
    ["12.00-", -1200],
    ["(5.00)", -500],
    ["+3.00", 300],
    ["£1,234.56", 123456],
    [" -£0.99 ", -99],
    ["\u22127.10", -710],
    ["12.5", 1250],
    ["12", 1200],
    ["1.15", 115],
    ["0.00", 0],
    ["-0.00", 0],
  ])("reads %j as %i pence", (input, expected) => {
    expect(parseMoneyToMinor(input)).toBe(expected);
  });

  it.each(["", "abc", "£", "12.345", "1,23.00", "12,50", "1.2.3", "99999999999"])(
    "returns null for %j",
    (input) => {
      expect(parseMoneyToMinor(input)).toBeNull();
    },
  );
});