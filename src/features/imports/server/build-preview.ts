import type { BalanceCheck } from "../parsers/balance";
import type { MatchedBy } from "../parsers/fingerprint";
import type { PdfBank } from "../parsers/pdfStatement";
import type { ColumnRole, RowIssue } from "../parsers/types";
import type { FlaggedRow } from "./duplicates";
import type { StatementFileType, StatementRead } from "./read-statement";

const SAMPLE_ROWS = 20;
const SAMPLE_SCAN_ROWS = 50;
const SENSITIVE_HEADER = /sort\s*-?\s*code|account\s*(number|no\b|num)|iban/i;

const PDF_BANK_NAMES: Record<PdfBank, string> = {
  barclays: "Barclays",
  lloyds: "Lloyds",
  hsbc: "HSBC",
  monzo: "Monzo",
  natwest: "NatWest",
};

export type MappableFailure = "no_date_column" | "no_amount_column";

export type PreviewRow = {
  rowNumber: number;
  date: string;
  description: string;
  amountMinor: number;
};

export type FlaggedPreviewRow = PreviewRow & {
  fingerprint: string;
  matchedBy: MatchedBy;
};

export type PreviewColumn = {
  index: number;
  header: string;
  role: ColumnRole | null;
  uncertain: boolean;
  sample: string | null;
  sampleHidden: boolean;
};

export type PreviewColumns = {
  items: PreviewColumn[];
  dateOrder: "dmy" | "mdy";
  dateOrderCertain: boolean;
  needsMapping: MappableFailure | null;
};

export type StatementPreview = {
  fileName: string;
  fileType: StatementFileType;
  bankName: string | null;
  columns: PreviewColumns | null;
  sample: PreviewRow[];
  flagged: FlaggedPreviewRow[];
  issues: RowIssue[];
  summary: {
    rowCount: number;
    skippedZero: number;
    dateFrom: string | null;
    dateTo: string | null;
    moneyInMinor: number;
    moneyOutMinor: number;
    balance: BalanceCheck["status"] | null;
  };
};

type SuccessfulRead = Extract<StatementRead, { ok: true }>;
type GridRead = Extract<SuccessfulRead, { kind: "grid" }>;

export function isMappableFailure(
  failure: string | null,
): failure is MappableFailure {
  return failure === "no_date_column" || failure === "no_amount_column";
}

export function bankNameOf(read: SuccessfulRead): string | null {
  if (read.kind === "grid") return read.analysis.bank?.name ?? null;
  return read.analysis.bank ? PDF_BANK_NAMES[read.analysis.bank] : null;
}

function toPreviewRow(row: FlaggedRow): PreviewRow {
  return {
    rowNumber: row.rowNumber,
    date: row.date,
    description: row.description,
    amountMinor: row.amountMinor,
  };
}

function buildColumns(read: GridRead): PreviewColumns {
  const { detection, failure } = read.analysis;

  const roleByIndex = new Map<number, ColumnRole>();
  for (const [role, index] of Object.entries(detection.mapping)) {
    if (index !== undefined) roleByIndex.set(index, role as ColumnRole);
  }

  const firstDataRow = detection.headerRowIndex + 1;
  const dataRows = read.grid.slice(firstDataRow, firstDataRow + SAMPLE_SCAN_ROWS);

  const items = detection.headers.map((header, index) => {
    const role = roleByIndex.get(index) ?? null;
    const sampleHidden = SENSITIVE_HEADER.test(header);
    const sample = sampleHidden
      ? null
      : (dataRows.map((row) => row[index] ?? "").find((cell) => cell !== "") ??
        null);
    return {
      index,
      header,
      role,
      uncertain: role !== null && detection.uncertain.includes(role),
      sample,
      sampleHidden,
    };
  });

  return {
    items,
    dateOrder: detection.dateOrder,
    dateOrderCertain: detection.dateOrderCertain,
    needsMapping: isMappableFailure(failure) ? failure : null,
  };
}

/** Everything the import dialog shows, and nothing it doesn't need. */
export function buildPreview(
  read: SuccessfulRead,
  rows: readonly FlaggedRow[],
): StatementPreview {
  let moneyInMinor = 0;
  let moneyOutMinor = 0;
  let dateFrom: string | null = null;
  let dateTo: string | null = null;

  for (const row of rows) {
    if (row.amountMinor > 0) moneyInMinor += row.amountMinor;
    else moneyOutMinor -= row.amountMinor;
    if (dateFrom === null || row.date < dateFrom) dateFrom = row.date;
    if (dateTo === null || row.date > dateTo) dateTo = row.date;
  }

  return {
    fileName: read.fileName,
    fileType: read.fileType,
    bankName: bankNameOf(read),
    columns: read.kind === "grid" ? buildColumns(read) : null,
    sample: rows.slice(0, SAMPLE_ROWS).map(toPreviewRow),
    flagged: rows
      .filter((row) => row.duplicate)
      .map((row) => ({
        ...toPreviewRow(row),
        fingerprint: row.fingerprint,
        matchedBy: row.matchedBy,
      })),
    issues: read.analysis.normalised.issues,
    summary: {
      rowCount: rows.length,
      skippedZero: read.analysis.normalised.skippedZero,
      dateFrom,
      dateTo,
      moneyInMinor,
      moneyOutMinor,
      balance: read.kind === "grid" ? read.analysis.balance.status : null,
    },
  };
}