/** One row as read from the file: every money column kept separate. */
export type ParsedRow = {
  rowNumber: number;
  date: string | null;
  amountMinor: number | null;
  moneyInMinor: number | null;
  moneyOutMinor: number | null;
  description: string;
  externalId: string | null;
};

/** One row ready to save: a single signed amount. */
export type NormalisedRow = {
  rowNumber: number;
  date: string;
  amountMinor: number;
  description: string;
  externalId: string | null;
};

export type RowIssueReason =
  | "missing_date"
  | "missing_amount"
  | "both_in_and_out"
  | "amount_mismatch";

export type RowIssue = { rowNumber: number; reason: RowIssueReason };

export type NormaliseResult = {
  rows: NormalisedRow[];
  skippedZero: number;
  issues: RowIssue[];
};