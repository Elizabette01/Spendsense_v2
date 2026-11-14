import type {
  NormaliseResult,
  NormalisedRow,
  ParsedRow,
  RowIssue,
  RowIssueReason,
} from "./types";

const MAX_DESCRIPTION_LENGTH = 500;

/** Collapses tabs, line breaks and repeated spaces into single spaces. */
export function cleanDescription(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  return cleaned.slice(0, MAX_DESCRIPTION_LENGTH) || "(no description)";
}

type Combined =
  | { ok: true; amountMinor: number }
  | { ok: false; reason: RowIssueReason };

/** Turns the money columns of one row into a single signed amount. */
export function combineAmount(row: ParsedRow): Combined {
  const { amountMinor, moneyInMinor, moneyOutMinor } = row;
  const hasInOut = moneyInMinor !== null || moneyOutMinor !== null;

  if (!hasInOut) {
    if (amountMinor === null) return { ok: false, reason: "missing_amount" };
    return { ok: true, amountMinor };
  }

  const moneyIn = Math.abs(moneyInMinor ?? 0);
  const moneyOut = Math.abs(moneyOutMinor ?? 0);
  if (moneyIn !== 0 && moneyOut !== 0) {
    return { ok: false, reason: "both_in_and_out" };
  }

  const combined = moneyIn - moneyOut;
  if (amountMinor !== null && amountMinor !== combined) {
    return { ok: false, reason: "amount_mismatch" };
  }
  return { ok: true, amountMinor: combined };
}

export function normaliseRows(parsed: ParsedRow[]): NormaliseResult {
  const rows: NormalisedRow[] = [];
  const issues: RowIssue[] = [];
  let skippedZero = 0;

  for (const row of parsed) {
    if (row.date === null) {
      issues.push({ rowNumber: row.rowNumber, reason: "missing_date" });
      continue;
    }

    const combined = combineAmount(row);
    if (!combined.ok) {
      issues.push({ rowNumber: row.rowNumber, reason: combined.reason });
      continue;
    }

    if (combined.amountMinor === 0) {
      skippedZero += 1;
      continue;
    }

    rows.push({
      rowNumber: row.rowNumber,
      date: row.date,
      amountMinor: combined.amountMinor,
      description: cleanDescription(row.description),
      externalId: row.externalId,
    });
  }

  return { rows, skippedZero, issues };
}