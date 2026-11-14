/** One row as read from the file: every money column kept separate. */
export type ParsedRow = {
  rowNumber: number;
  date: string | null;
  amountMinor: number | null;
  moneyInMinor: number | null;
  moneyOutMinor: number | null;
  description: string;
  externalId: string | null;
  balanceMinor?: number | null;
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

/** A file as rows of text cells, whichever format it came from. */
export type Grid = string[][];

export type ReadFailure = "not_text" | "empty" | "too_many_rows" | "not_spreadsheet";

export type ReadResult =
  | { ok: true; grid: Grid }
  | { ok: false; reason: ReadFailure };

export type ColumnRole =
  | "date"
  | "description"
  | "amount"
  | "moneyIn"
  | "moneyOut"
  | "balance"
  | "externalId";

/** Which column of the grid plays each role. */
export type ColumnMapping = Partial<Record<ColumnRole, number>>;

export type DetectionResult = {
  /** Position of the header row in the grid, or -1 when there isn't one. */
  headerRowIndex: number;
  /** Header text for each column, or "Column 1"… when there is no header row. */
  headers: string[];
  mapping: ColumnMapping;
  /** Roles worked out from cell contents, for the dialog to highlight. */
  uncertain: ColumnRole[];
  dateOrder: "dmy" | "mdy";
  dateOrderCertain: boolean;
};