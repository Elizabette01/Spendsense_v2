import { describe, expect, it } from "vitest";

import {
  columnMappingSchema,
  dateOrderSchema,
  duplicateDecisionsSchema,
} from "./schemas";

const FINGERPRINT = "a".repeat(64);

describe("columnMappingSchema", () => {
  it("accepts a valid mapping", () => {
    const result = columnMappingSchema.safeParse({
      date: 0,
      description: 1,
      moneyOut: 2,
      moneyIn: 3,
    });
    expect(result.success).toBe(true);
  });

  it("accepts an empty mapping", () => {
    expect(columnMappingSchema.safeParse({}).success).toBe(true);
  });

  it("rejects one column matched to two roles", () => {
    const result = columnMappingSchema.safeParse({ date: 0, amount: 0 });
    expect(result.success).toBe(false);
  });

  it.each([-1, 100, 2.5, "3"])("rejects an index of %s", (index) => {
    const result = columnMappingSchema.safeParse({ date: index });
    expect(result.success).toBe(false);
  });

  it("drops roles it does not know", () => {
    const result = columnMappingSchema.parse({ date: 0, sortCode: 4 });
    expect(result).toEqual({ date: 0 });
  });
});

describe("dateOrderSchema", () => {
  it.each(["dmy", "mdy"])("accepts %s", (order) => {
    expect(dateOrderSchema.safeParse(order).success).toBe(true);
  });

  it("rejects any other order", () => {
    expect(dateOrderSchema.safeParse("ymd").success).toBe(false);
  });
});

describe("duplicateDecisionsSchema", () => {
  it("accepts a default choice with per-row overrides", () => {
    const result = duplicateDecisionsSchema.safeParse({
      defaultChoice: "skip",
      overrides: { [FINGERPRINT]: "import" },
    });
    expect(result.success).toBe(true);
  });

  it("uses an empty overrides object when none is sent", () => {
    const result = duplicateDecisionsSchema.parse({});
    expect(result.overrides).toEqual({});
    expect(result.defaultChoice).toBeUndefined();
  });

  it.each(["not-a-hash", "A".repeat(64), "a".repeat(63)])(
    "rejects the override key %s",
    (key) => {
      const result = duplicateDecisionsSchema.safeParse({
        overrides: { [key]: "skip" },
      });
      expect(result.success).toBe(false);
    },
  );

  it("rejects a choice that is not skip or import", () => {
    const result = duplicateDecisionsSchema.safeParse({
      overrides: { [FINGERPRINT]: "delete" },
    });
    expect(result.success).toBe(false);
  });
});