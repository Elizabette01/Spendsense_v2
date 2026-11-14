import { describe, expect, it } from "vitest";
import { addFingerprints } from "./fingerprint";
import type { NormalisedRow } from "./types";

function row(overrides: Partial<NormalisedRow> = {}): NormalisedRow {
  return {
    rowNumber: 1,
    date: "2026-01-15",
    amountMinor: -175,
    description: "Bus Fare",
    externalId: null,
    ...overrides,
  };
}

describe("addFingerprints", () => {
  it("gives a 64-character fingerprint", () => {
    const [first] = addFingerprints([row()], null);
    expect(first.fingerprint).toMatch(/^[0-9a-f]{64}$/);
  });

  it("gives identical rows in one file different fingerprints", () => {
    const [first, second] = addFingerprints([row(), row()], null);

    expect(first.occurrence).toBe(0);
    expect(second.occurrence).toBe(1);
    expect(first.fingerprint).not.toBe(second.fingerprint);
  });

  it("gives the same fingerprints when the same file is read again", () => {
    const firstUpload = addFingerprints([row(), row()], null);
    const secondUpload = addFingerprints([row(), row()], null);

    expect(secondUpload.map((r) => r.fingerprint)).toEqual(
      firstUpload.map((r) => r.fingerprint),
    );
  });

  it("ignores capital letters in the description", () => {
    const [upper] = addFingerprints([row({ description: "BUS FARE" })], null);
    const [lower] = addFingerprints([row({ description: "bus fare" })], null);

    expect(upper.fingerprint).toBe(lower.fingerprint);
  });

  it("tells different amounts, dates and descriptions apart", () => {
    const rows = addFingerprints(
      [
        row(),
        row({ amountMinor: -176 }),
        row({ date: "2026-01-16" }),
        row({ description: "Train Fare" }),
      ],
      null,
    );

    expect(new Set(rows.map((r) => r.fingerprint)).size).toBe(4);
  });

  it("uses the bank's own ID when there is one", () => {
    const [first] = addFingerprints(
      [row({ externalId: "tx_001", description: "Old name" })],
      "Monzo",
    );
    const [renamed] = addFingerprints(
      [row({ externalId: "tx_001", description: "New name" })],
      "Monzo",
    );

    expect(first.matchedBy).toBe("id");
    expect(first.fingerprint).toBe(renamed.fingerprint);
  });

  it("marks rows without an ID as matched by content", () => {
    const [first] = addFingerprints([row()], null);
    expect(first.matchedBy).toBe("content");
  });
});