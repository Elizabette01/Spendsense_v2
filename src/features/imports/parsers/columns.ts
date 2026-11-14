import { parseDate, type DateOrder } from "./dates";
import { parseMoneyToMinor } from "./money";
import type {
  ColumnMapping,
  ColumnRole,
  DetectionResult,
  Grid,
} from "./types";

const HEADER_SEARCH_ROWS = 20;
const SAMPLE_ROWS = 200;
const MOSTLY = 0.8;

/** Header names banks use for each role, most trusted first. */
const ALIASES: Record<ColumnRole, string[]> = {
  date: ["date", "transactiondate", "posteddate", "postingdate", "entrydate"],
  description: [
    "description",
    "transactiondescription",
    "memo",
    "narrative",
    "details",
    "name",
    "payee",
    "merchant",
    "reference",
  ],
  amount: ["amount", "value"],
  moneyIn: ["moneyin", "paidin", "creditamount", "credit", "receipts", "in"],
  moneyOut: ["moneyout", "paidout", "debitamount", "debit", "payments", "out"],
  balance: ["balance", "runningbalance"],
  externalId: ["transactionid", "id"],
};

const ROLES = Object.keys(ALIASES) as ColumnRole[];
const KNOWN_HEADERS = new Set(Object.values(ALIASES).flat());

/** "Transaction Date" and "transaction_date" both become "transactiondate". */
export function normaliseHeader(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isDateCell(text: string): boolean {
  return parseDate(text, "dmy") !== null || parseDate(text, "mdy") !== null;
}

function isMoneyCell(text: string): boolean {
  return parseMoneyToMinor(text) !== null;
}

// ---------- Finding the header row ----------

export function findHeaderRow(grid: Grid): number {
  const limit = Math.min(grid.length, HEADER_SEARCH_ROWS);

  // 1. A row containing at least two header names we recognise
  for (let i = 0; i < limit; i++) {
    const known = grid[i].filter((cell) =>
      KNOWN_HEADERS.has(normaliseHeader(cell)),
    );
    if (known.length >= 2) return i;
  }

  // 2. A row of plain text sitting directly above a row of data
  for (let i = 0; i < limit - 1; i++) {
    const row = grid[i];
    const next = grid[i + 1];
    const isPlainText =
      row.some((cell) => cell !== "") &&
      row.every((cell) => !isDateCell(cell) && !isMoneyCell(cell));
    const nextIsData = next.some(isDateCell) || next.some(isMoneyCell);
    if (isPlainText && nextIsData) return i;
  }

  return -1;
}

// ---------- Matching by header name ----------

function matchByName(headers: string[]): ColumnMapping {
  const normalised = headers.map(normaliseHeader);
  const mapping: ColumnMapping = {};

  for (const role of ROLES) {
    for (const alias of ALIASES[role]) {
      const index = normalised.indexOf(alias);
      if (index !== -1) {
        mapping[role] = index;
        break;
      }
    }
  }
  return mapping;
}

// ---------- Day-first or month-first ----------

export function detectDateOrder(values: string[]): {
  order: DateOrder;
  certain: boolean;
  conflicting: boolean;
} {
  let dayFirst = false;
  let monthFirst = false;

  for (const value of values) {
    const match = /^(\d{1,2})[/.-](\d{1,2})[/.-]/.exec(value.trim());
    if (!match) continue;
    if (Number(match[1]) > 12) dayFirst = true;
    if (Number(match[2]) > 12) monthFirst = true;
  }

  if (dayFirst && monthFirst) {
    return { order: "dmy", certain: false, conflicting: true };
  }
  if (monthFirst) return { order: "mdy", certain: true, conflicting: false };
  return { order: "dmy", certain: dayFirst, conflicting: false };
}

// ---------- Matching by cell contents ----------

type ColumnStats = {
  index: number;
  filled: number;
  dateRatio: number;
  moneyRatio: number;
  decimalRatio: number;
  distinct: number;
  averageLength: number;
};

function profileColumn(rows: Grid, index: number): ColumnStats {
  const cells = rows.map((row) => row[index] ?? "").filter((c) => c !== "");
  const filled = cells.length;
  const share = (count: number) => (filled === 0 ? 0 : count / filled);

  return {
    index,
    filled,
    dateRatio: share(cells.filter(isDateCell).length),
    moneyRatio: share(cells.filter(isMoneyCell).length),
    decimalRatio: share(cells.filter((c) => c.includes(".")).length),
    distinct: new Set(cells).size,
    averageLength: share(cells.reduce((sum, c) => sum + c.length, 0)),
  };
}

function neverBothFilled(rows: Grid, a: number, b: number): boolean {
  return rows.every((row) => !(row[a] ?? "") || !(row[b] ?? ""));
}

function matchByContent(
  rows: Grid,
  width: number,
  mapping: ColumnMapping,
): ColumnRole[] {
  const uncertain: ColumnRole[] = [];
  const stats = Array.from({ length: width }, (_, i) => profileColumn(rows, i));
  const taken = () => new Set(Object.values(mapping));
  const set = (role: ColumnRole, index: number) => {
    mapping[role] = index;
    uncertain.push(role);
  };

  // Date: the column where most cells read as dates
  if (mapping.date === undefined) {
    const best = stats
      .filter((s) => !taken().has(s.index) && s.dateRatio >= MOSTLY)
      .sort((a, b) => b.filled - a.filled)[0];
    if (best) set("date", best.index);
  }

  // Money: mostly amounts, and written with a decimal point
  const money = stats.filter(
    (s) =>
      !taken().has(s.index) &&
      s.moneyRatio >= MOSTLY &&
      s.decimalRatio >= 0.5,
  );
  const hasAmount =
    mapping.amount !== undefined ||
    mapping.moneyIn !== undefined ||
    mapping.moneyOut !== undefined;

  if (!hasAmount && money.length === 1) {
    set("amount", money[0].index);
  } else if (!hasAmount && money.length >= 2) {
    const [first, second] = money;
    const isPair =
      first.filled < rows.length &&
      second.filled < rows.length &&
      neverBothFilled(rows, first.index, second.index);
    if (isPair) {
      set("moneyOut", first.index);
      set("moneyIn", second.index);
    } else {
      set("amount", first.index);
    }
  }

  // Description: the remaining column with the most varied text
  if (mapping.description === undefined) {
    const moneyIndexes = new Set(money.map((s) => s.index));
    const best = stats
      .filter(
        (s) =>
          !taken().has(s.index) &&
          !moneyIndexes.has(s.index) &&
          s.dateRatio < MOSTLY &&
          s.moneyRatio < MOSTLY &&
          s.distinct > 0,
      )
      .sort(
        (a, b) => b.distinct - a.distinct || b.averageLength - a.averageLength,
      )[0];
    if (best) set("description", best.index);
  }

  return uncertain;
}

// ---------- Putting it together ----------

export function detectColumns(grid: Grid): DetectionResult {
  const headerRowIndex = findHeaderRow(grid);
  const width = Math.max(0, ...grid.map((row) => row.length));
  const headers =
    headerRowIndex >= 0
      ? grid[headerRowIndex]
      : Array.from({ length: width }, (_, i) => `Column ${i + 1}`);

  const rows = grid.slice(headerRowIndex + 1, headerRowIndex + 1 + SAMPLE_ROWS);
  const mapping = headerRowIndex >= 0 ? matchByName(headers) : {};
  const uncertain = matchByContent(rows, width, mapping);

  const dateIndex = mapping.date;
  const dateValues =
    dateIndex === undefined ? [] : rows.map((row) => row[dateIndex] ?? "");
  const { order, certain } = detectDateOrder(dateValues);

  return {
    headerRowIndex,
    headers,
    mapping,
    uncertain,
    dateOrder: order,
    dateOrderCertain: certain,
  };
}