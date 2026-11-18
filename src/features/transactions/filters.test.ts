import { describe, expect, it } from "vitest";

import { filtersHref, pageList, parseTransactionFilters } from "./filters";

describe("parseTransactionFilters", () => {
  it("has sensible defaults", () => {
    expect(parseTransactionFilters({})).toEqual({
      search: null,
      category: null,
      month: null,
      type: null,
      page: 1,
    });
  });

  it("reads every filter", () => {
    expect(
      parseTransactionFilters({ q: " tesco ", category: "sys_groceries", month: "2026-10", type: "out", page: "3" }),
    ).toEqual({ search: "tesco", category: "sys_groceries", month: "2026-10", type: "out", page: 3 });
  });

  it("treats review=1 as the Needs review category", () => {
    expect(parseTransactionFilters({ review: "1" }).category).toBe("review");
  });

  it.each([
    [{ month: "2026-13" }, "month", null],
    [{ month: "Oct 2026" }, "month", null],
    [{ type: "both" }, "type", null],
    [{ category: "x'; drop table" }, "category", null],
    [{ page: "0" }, "page", 1],
    [{ page: "2.5" }, "page", 1],
    [{ page: "abc" }, "page", 1],
    [{ q: "   " }, "search", null],
    [{ q: ["a", "b"] }, "search", null],
  ] as const)("ignores %j", (params, key, expected) => {
    expect(parseTransactionFilters(params as never)[key]).toBe(expected);
  });

  it("caps the search length", () => {
    expect(parseTransactionFilters({ q: "a".repeat(500) }).search).toHaveLength(100);
  });
});

describe("filtersHref", () => {
  it("leaves out empty filters and page 1", () => {
    expect(filtersHref({})).toBe("/transactions");
    expect(filtersHref({ category: "review", page: 1 })).toBe("/transactions?category=review");
    expect(filtersHref({ search: "costa coffee", type: "out", page: 2 })).toBe(
      "/transactions?q=costa+coffee&type=out&page=2",
    );
  });
});

describe("pageList", () => {
  it.each([
    [1, 1, [1]],
    [1, 3, [1, 2, 3]],
    [1, 6, [1, 2, null, 6]],
    [4, 10, [1, null, 3, 4, 5, null, 10]],
    [10, 10, [1, null, 9, 10]],
  ])("page %d of %d", (current, count, expected) => {
    expect(pageList(current, count)).toEqual(expected);
  });
});
