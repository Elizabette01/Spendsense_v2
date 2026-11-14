import { checkBalance, type BalanceCheck } from "./balance";
import { detectColumns, detectDateOrder, normaliseHeader } from "./columns";
import type { DateOrder } from "./dates";
import { extractRows } from "./extract";
import { normaliseRows } from "./normalise";
import { findProfile, profileColumns } from "./profiles";
import type {
  ColumnMapping,
  DetectionResult,
  Grid,
  NormaliseResult,
} from "./types";

const MIN_READABLE = 0.8;

export type StatementFailure =
  | "no_date_column"
  | "no_amount_column"
  | "conflicting_dates"
  | "not_gbp"
  | "no_transactions"
  | "mostly_unreadable";

export type AnalyseOptions = {
  /** The user's column choices from the import dialog. */
  mapping?: ColumnMapping;
  dateOrder?: DateOrder;
};

export type Analysis = {
  bank: { id: string; name: string; verified: boolean } | null;
  /** The columns and date order actually used. */
  detection: DetectionResult;
  normalised: NormaliseResult;
  ignoredLines: number;
  balance: BalanceCheck;
  /** null means the file reads as a bank statement. */
  failure: StatementFailure | null;
};

function columnValues(grid: Grid, from: number, index: number | undefined) {
  if (index === undefined) return [];
  return grid.slice(from).map((line) => (line[index] ?? "").trim());
}

function hasNonGbp(values: string[]): boolean {
  return values.some((value) => value !== "" && value.toUpperCase() !== "GBP");
}

/** Runs every step on a grid and says whether it reads as a statement. */
export function analyseGrid(grid: Grid, options: AnalyseOptions = {}): Analysis {
  const detected = detectColumns(grid);
  const { headerRowIndex, headers } = detected;
  const profile = headerRowIndex >= 0 ? findProfile(headers) : null;

  // 1. Decide the columns: the user's choice, else the bank's, else detected
  let mapping = detected.mapping;
  let uncertain = detected.uncertain;
  let descriptionFallbacks: number[] = [];
  let lines = grid;

  if (profile) {
    const fromProfile = profileColumns(profile, headers);
    mapping = fromProfile.mapping;
    descriptionFallbacks = fromProfile.descriptionFallbacks;
    uncertain = [];

    const repair = profile.repairLine;
    if (repair) {
      lines = grid.map((line, i) =>
        i > headerRowIndex ? repair(line, headers.length) : line,
      );
    }
  }
  if (options.mapping) {
    mapping = options.mapping;
    uncertain = [];
  }

  // 2. Decide the date order the same way
  const firstRow = headerRowIndex + 1;
  const dateCheck = detectDateOrder(columnValues(lines, firstRow, mapping.date));
  const dateOrder: DateOrder =
    options.dateOrder ?? profile?.dateOrder ?? dateCheck.order;
  const dateOrderCertain =
    options.dateOrder !== undefined || profile !== null || dateCheck.certain;

  // 3. Read, combine and check the rows
  const extracted = extractRows(lines, {
    headerRowIndex,
    mapping,
    dateOrder,
    descriptionFallbacks,
  });
  const normalised = normaliseRows(extracted.rows);
  const balance = checkBalance(extracted.rows);

  // 4. Is it a bank statement?
  const normalisedHeaders = headers.map(normaliseHeader);
  const currencyIndex = normalisedHeaders.indexOf(
    profile?.currencyColumn ?? "currency",
  );
  const candidates =
    normalised.rows.length + normalised.skippedZero + normalised.issues.length;
  const readable = normalised.rows.length + normalised.skippedZero;
  const hasAmount =
    mapping.amount !== undefined ||
    mapping.moneyIn !== undefined ||
    mapping.moneyOut !== undefined;

  let failure: StatementFailure | null = null;
  if (mapping.date === undefined) failure = "no_date_column";
  else if (!hasAmount) failure = "no_amount_column";
  else if (dateCheck.conflicting && !options.dateOrder) {
    failure = "conflicting_dates";
  } else if (
    currencyIndex !== -1 &&
    hasNonGbp(columnValues(lines, firstRow, currencyIndex))
  ) {
    failure = "not_gbp";
  } else if (normalised.rows.length === 0 && normalised.issues.length === 0) {
    failure = "no_transactions";
  } else if (candidates === 0 || readable / candidates < MIN_READABLE) {
    failure = "mostly_unreadable";
  }

  return {
    bank: profile
      ? { id: profile.id, name: profile.name, verified: profile.verified }
      : null,
    detection: {
      headerRowIndex,
      headers,
      mapping,
      uncertain,
      dateOrder,
      dateOrderCertain,
    },
    normalised,
    ignoredLines: extracted.ignoredLines,
    balance,
    failure,
  };
}