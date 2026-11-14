import { combineAmount } from "./normalise";
import type { ParsedRow } from "./types";

export type BalanceCheck =
  | { status: "none" }
  | { status: "consistent"; newestFirst: boolean }
  | { status: "inverted"; newestFirst: boolean }
  | { status: "inconsistent" };

const MIN_PAIRS = 2;
const AGREEMENT = 0.9;

type Point = { amount: number; balance: number };

function toPoint(row: ParsedRow): Point | null {
  if (row.balanceMinor === null || row.balanceMinor === undefined) return null;
  const combined = combineAmount(row);
  if (!combined.ok) return null;
  return { amount: combined.amountMinor, balance: row.balanceMinor };
}

/** Checks that each row's amount explains the change in the running balance. */
export function checkBalance(rows: ParsedRow[]): BalanceCheck {
  const points = rows.map(toPoint);
  const hits = {
    oldestFirst: 0,
    newestFirst: 0,
    oldestFirstInverted: 0,
    newestFirstInverted: 0,
  };
  let pairs = 0;

  for (let i = 1; i < points.length; i++) {
    const before = points[i - 1];
    const after = points[i];
    if (!before || !after) continue;
    pairs += 1;

    if (before.balance + after.amount === after.balance) hits.oldestFirst += 1;
    if (after.balance + before.amount === before.balance) hits.newestFirst += 1;
    if (before.balance - after.amount === after.balance) {
      hits.oldestFirstInverted += 1;
    }
    if (after.balance - before.amount === before.balance) {
      hits.newestFirstInverted += 1;
    }
  }

  if (pairs < MIN_PAIRS) return { status: "none" };
  const agrees = (count: number) => count / pairs >= AGREEMENT;

  if (agrees(hits.oldestFirst)) return { status: "consistent", newestFirst: false };
  if (agrees(hits.newestFirst)) return { status: "consistent", newestFirst: true };
  if (agrees(hits.oldestFirstInverted)) {
    return { status: "inverted", newestFirst: false };
  }
  if (agrees(hits.newestFirstInverted)) {
    return { status: "inverted", newestFirst: true };
  }
  return { status: "inconsistent" };
}