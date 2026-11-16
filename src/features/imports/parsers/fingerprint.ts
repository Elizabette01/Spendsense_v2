import { createHash } from "node:crypto";
import type { NormalisedRow } from "./types";

export type MatchedBy = "id" | "content";

export type FingerprintedRow = NormalisedRow & {
  fingerprint: string;
  fingerprintBase: string;
  occurrence: number;
  matchedBy: MatchedBy;
};

/** The text that identifies a transaction, before the repeat counter is added. */
export function fingerprintBase(
  row: NormalisedRow,
  bank: string | null,
): { base: string; matchedBy: MatchedBy } {
  if (row.externalId) {
    return {
      base: `id|${bank ?? "unknown"}|${row.externalId}`,
      matchedBy: "id",
    };
  }
  const description = row.description.toLowerCase();
  return {
    base: `row|${row.date}|${row.amountMinor}|${description}`,
    matchedBy: "content",
  };
}

export function hashFingerprint(base: string, occurrence: number): string {
  return createHash("sha256").update(`${base}#${occurrence}`).digest("hex");
}

/** Gives every row a fingerprint; identical rows in one file get 0, 1, 2… */
export function addFingerprints(
  rows: NormalisedRow[],
  bank: string | null,
): FingerprintedRow[] {
  const seen = new Map<string, number>();

  return rows.map((row) => {
    const { base, matchedBy } = fingerprintBase(row, bank);
    const occurrence = seen.get(base) ?? 0;
    seen.set(base, occurrence + 1);

    return {
      ...row,
      fingerprint: hashFingerprint(base, occurrence),
      fingerprintBase: base,
      occurrence,
      matchedBy,
    };
  });
}