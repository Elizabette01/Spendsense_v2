import { parseDate, type DateOrder } from "./dates";
import { parseMoneyToMinor } from "./money";
import type { ColumnMapping, Grid, ParsedRow } from "./types";

export type ExtractOptions = {
  headerRowIndex: number;
  mapping: ColumnMapping;
  dateOrder: DateOrder;
  /** Columns to try, in order, when the description column is empty. */
  descriptionFallbacks?: number[];
};

export type ExtractResult = {
  rows: ParsedRow[];
  /** Lines with no date and no amount: repeated headers, notes, blank totals. */
  ignoredLines: number;
};

type MoneyCell = { value: number | null; unreadable: boolean };

function cell(line: string[], index: number | undefined): string {
  return index === undefined ? "" : (line[index] ?? "").trim();
}

function readMoney(line: string[], index: number | undefined): MoneyCell {
  const text = cell(line, index);
  if (text === "") return { value: null, unreadable: false };
  const value = parseMoneyToMinor(text);
  return { value, unreadable: value === null };
}

/** Applies a column mapping to every line below the header. */
export function extractRows(grid: Grid, options: ExtractOptions): ExtractResult {
  const { headerRowIndex, mapping, dateOrder, descriptionFallbacks = [] } =
    options;
  const rows: ParsedRow[] = [];
  let ignoredLines = 0;

  for (let i = headerRowIndex + 1; i < grid.length; i++) {
    const line = grid[i];

    const dateText = cell(line, mapping.date);
    const date = dateText === "" ? null : parseDate(dateText, dateOrder);

    const amount = readMoney(line, mapping.amount);
    const moneyIn = readMoney(line, mapping.moneyIn);
    const moneyOut = readMoney(line, mapping.moneyOut);
    const moneyCells = [amount, moneyIn, moneyOut];

    // Not a transaction: no readable date and no readable amount
    const hasMoney = moneyCells.some((m) => m.value !== null);
    if (date === null && !hasMoney) {
      ignoredLines += 1;
      continue;
    }

    // One unreadable amount makes the whole row's money untrustworthy
    const unreadable = moneyCells.some((m) => m.unreadable);

    const description =
      [mapping.description, ...descriptionFallbacks]
        .map((index) => cell(line, index))
        .find((text) => text !== "") ?? "";

    rows.push({
      rowNumber: i + 1,
      date,
      amountMinor: unreadable ? null : amount.value,
      moneyInMinor: unreadable ? null : moneyIn.value,
      moneyOutMinor: unreadable ? null : moneyOut.value,
      description,
      externalId: cell(line, mapping.externalId) || null,
      balanceMinor: readMoney(line, mapping.balance).value,
    });
  }

  return { rows, ignoredLines };
}