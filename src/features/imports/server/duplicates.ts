import "server-only";

import { db } from "@/lib/db";

import { hashFingerprint, type FingerprintedRow } from "../parsers/fingerprint";

const BATCH_SIZE = 5_000;
const MAX_ROUNDS = 50;

export type FlaggedRow = FingerprintedRow & { duplicate: boolean };

export type AssignResult =
  | { ok: true; rows: FingerprintedRow[] }
  | { ok: false };

/** Which of these fingerprints this user has already imported. */
export async function findExistingFingerprints(
  userId: string,
  fingerprints: readonly string[],
): Promise<Set<string>> {
  const unique = [...new Set(fingerprints)];
  const existing = new Set<string>();

  for (let start = 0; start < unique.length; start += BATCH_SIZE) {
    const batch = unique.slice(start, start + BATCH_SIZE);
    const found = await db.transaction.findMany({
      where: { userId, fingerprint: { in: batch } },
      select: { fingerprint: true },
    });
    for (const row of found) existing.add(row.fingerprint);
  }

  return existing;
}

/** Marks rows that match an earlier upload. Nothing is removed. */
export function flagDuplicates(
  rows: readonly FingerprintedRow[],
  existing: ReadonlySet<string>,
): FlaggedRow[] {
  return rows.map((row) => ({
    ...row,
    duplicate: existing.has(row.fingerprint),
  }));
}

/**
 * Gives each "import anyway" row a fingerprint nothing else is using.
 * `reserved` is every fingerprint in the file being imported.
 */
export async function assignFreeFingerprints(
  userId: string,
  rows: readonly FingerprintedRow[],
  reserved: ReadonlySet<string>,
): Promise<AssignResult> {
  const taken = new Set(reserved);
  const lastTried = new Map<string, number>();
  const assigned = new Array<FingerprintedRow>(rows.length);
  let pending = rows.map((row, index) => ({ row, index }));

  for (let round = 0; round < MAX_ROUNDS && pending.length > 0; round++) {
    // 1. Propose the next unused occurrence for each row still waiting
    const proposals = pending.map(({ row, index }) => {
      let occurrence =
        (lastTried.get(row.fingerprintBase) ?? row.occurrence) + 1;
      let fingerprint = hashFingerprint(row.fingerprintBase, occurrence);
      while (taken.has(fingerprint)) {
        occurrence += 1;
        fingerprint = hashFingerprint(row.fingerprintBase, occurrence);
      }
      lastTried.set(row.fingerprintBase, occurrence);
      taken.add(fingerprint);
      return { row, index, occurrence, fingerprint };
    });

    // 2. One query: which proposals does the database already hold?
    const clashes = await findExistingFingerprints(
      userId,
      proposals.map((proposal) => proposal.fingerprint),
    );

    // 3. Keep the free ones; the rest go round again
    pending = [];
    for (const { row, index, occurrence, fingerprint } of proposals) {
      if (clashes.has(fingerprint)) {
        pending.push({ row, index });
      } else {
        assigned[index] = { ...row, occurrence, fingerprint };
      }
    }
  }

  return pending.length === 0 ? { ok: true, rows: assigned } : { ok: false };
}