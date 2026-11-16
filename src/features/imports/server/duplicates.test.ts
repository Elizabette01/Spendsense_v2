import { beforeEach, describe, expect, it, vi } from "vitest";

import { hashFingerprint, type FingerprintedRow } from "../parsers/fingerprint";
import {
  assignFreeFingerprints,
  findExistingFingerprints,
  flagDuplicates,
} from "./duplicates";

const fake = vi.hoisted(() => ({
  stored: new Set<string>(),
  batchSizes: [] as number[],
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db", () => ({
  db: {
    transaction: {
      findMany: async ({
        where,
      }: {
        where: { userId: string; fingerprint: { in: string[] } };
      }) => {
        fake.batchSizes.push(where.fingerprint.in.length);
        return where.fingerprint.in
          .filter((fingerprint) =>
            fake.stored.has(`${where.userId}|${fingerprint}`),
          )
          .map((fingerprint) => ({ fingerprint }));
      },
    },
  },
}));

const USER = "user-1";

function save(userId: string, base: string, occurrence: number) {
  fake.stored.add(`${userId}|${hashFingerprint(base, occurrence)}`);
}

function makeRow(base: string, occurrence = 0): FingerprintedRow {
  return {
    fingerprintBase: base,
    occurrence,
    fingerprint: hashFingerprint(base, occurrence),
    matchedBy: "content",
  } as FingerprintedRow;
}

beforeEach(() => {
  fake.stored.clear();
  fake.batchSizes.length = 0;
});

describe("findExistingFingerprints", () => {
  it("returns only this user's matches", async () => {
    save(USER, "a", 0);
    save("someone-else", "b", 0);

    const found = await findExistingFingerprints(USER, [
      hashFingerprint("a", 0),
      hashFingerprint("b", 0),
    ]);

    expect([...found]).toEqual([hashFingerprint("a", 0)]);
  });

  it("queries in batches of 5,000", async () => {
    const many = Array.from({ length: 12_000 }, (_, i) => `fp-${i}`);
    await findExistingFingerprints(USER, many);
    expect(fake.batchSizes).toEqual([5_000, 5_000, 2_000]);
  });

  it("asks about each fingerprint once", async () => {
    await findExistingFingerprints(USER, ["x", "x", "x"]);
    expect(fake.batchSizes).toEqual([1]);
  });
});

describe("flagDuplicates", () => {
  it("flags matches and keeps every row in order", () => {
    const rows = [makeRow("a"), makeRow("b"), makeRow("c")];
    const existing = new Set([hashFingerprint("b", 0)]);

    const flagged = flagDuplicates(rows, existing);

    expect(flagged.map((row) => row.duplicate)).toEqual([false, true, false]);
    expect(flagged.map((row) => row.fingerprintBase)).toEqual(["a", "b", "c"]);
  });

  it("does not flag a repeat inside the same file", () => {
    const rows = [makeRow("a", 0), makeRow("a", 1)];
    const existing = new Set([hashFingerprint("a", 0)]);

    const flagged = flagDuplicates(rows, existing);

    expect(flagged.map((row) => row.duplicate)).toEqual([true, false]);
  });
});

describe("assignFreeFingerprints", () => {
  it("moves a clashing row to the next occurrence", async () => {
    save(USER, "a", 0);
    const row = makeRow("a", 0);

    const result = await assignFreeFingerprints(
      USER,
      [row],
      new Set([row.fingerprint]),
    );

    if (!result.ok) throw new Error("expected ok");
    expect(result.rows[0].occurrence).toBe(1);
    expect(result.rows[0].fingerprint).toBe(hashFingerprint("a", 1));
  });

  it("keeps going when the next occurrence is taken too", async () => {
    save(USER, "a", 0);
    save(USER, "a", 1);
    const row = makeRow("a", 0);

    const result = await assignFreeFingerprints(
      USER,
      [row],
      new Set([row.fingerprint]),
    );

    if (!result.ok) throw new Error("expected ok");
    expect(result.rows[0].occurrence).toBe(2);
  });

  it("gives identical rows different fingerprints, in order", async () => {
    save(USER, "a", 0);
    save(USER, "a", 1);
    const rows = [makeRow("a", 0), makeRow("a", 1)];
    const reserved = new Set(rows.map((row) => row.fingerprint));

    const result = await assignFreeFingerprints(USER, rows, reserved);

    if (!result.ok) throw new Error("expected ok");
    expect(result.rows.map((row) => row.occurrence)).toEqual([2, 3]);
  });

  it("skips occurrences used by other rows in the file", async () => {
    save(USER, "a", 0);
    const row = makeRow("a", 0);
    const reserved = new Set([row.fingerprint, hashFingerprint("a", 1)]);

    const result = await assignFreeFingerprints(USER, [row], reserved);

    if (!result.ok) throw new Error("expected ok");
    expect(result.rows[0].occurrence).toBe(2);
  });

  it("gives up after the round cap instead of looping forever", async () => {
    for (let occurrence = 0; occurrence <= 60; occurrence++) {
      save(USER, "a", occurrence);
    }
    const row = makeRow("a", 0);

    const result = await assignFreeFingerprints(
      USER,
      [row],
      new Set([row.fingerprint]),
    );

    expect(result).toEqual({ ok: false });
  });

  it("does nothing when there are no rows", async () => {
    const result = await assignFreeFingerprints(USER, [], new Set());
    expect(result).toEqual({ ok: true, rows: [] });
    expect(fake.batchSizes).toEqual([]);
  });
});