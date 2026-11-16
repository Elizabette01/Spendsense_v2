import { parseDate } from "./dates";
import { parseMoneyToMinor } from "./money";
import { normaliseRows } from "./normalise";
import type { NormaliseResult, ParsedRow } from "./types";

export type PdfBank = "barclays" | "lloyds" | "hsbc" | "monzo" | "natwest";

export type PdfStatementFailure =
  | "not_a_statement"
  | "no_transactions"
  | "mostly_unreadable";

export type PdfAnalysis = {
  bank: PdfBank | null;
  normalised: NormaliseResult;
  /** Lines that weren't transactions, balances or continuations. */
  ignoredLines: number;
  failure: PdfStatementFailure | null;
};

const BANK_NAMES: [PdfBank, RegExp][] = [
  ["barclays", /\bbarclays\b/i],
  ["lloyds", /\blloyds\b/i],
  ["hsbc", /\bhsbc\b/i],
  ["monzo", /\bmonzo\b/i],
  ["natwest", /\bnatwest\b|\bnational westminster\b/i],
];

const BALANCE_LINE =
  /brought forward|carried forward|opening balance|closing balance|start balance|end balance|previous balance|balance b\/?f|balance c\/?f/i;

/** "Total paid out 6.25" and similar carry money but aren't transactions. */
const SUMMARY_LINE = /^totals?\b.*\b(in|out|paid|payments|credits|debits|deposits|withdrawals)\b/i;

const MAX_GROUP = 12;
const MIN_READABLE = 0.8;

/** Which of the five banks the statement names, if any. */
export function detectBank(text: string): PdfBank | null {
  for (const [bank, pattern] of BANK_NAMES) {
    if (pattern.test(text)) return bank;
  }
  return null;
}

/** The year to give dates printed without one, such as "15 Jan". */
function statementYear(text: string): number | null {
  const match = /\b\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]{3,9}\s+((?:19|20)\d{2})\b/.exec(text)
    ?? /\b\d{1,2}[/.-]\d{1,2}[/.-]((?:19|20)\d{2})\b/.exec(text);
  return match ? Number(match[1]) : null;
}

/** Of last year, this year and next year, picks the one closest to the previous date. */
function closestYear(dayMonth: string, year: number, previous: string | null): string | null {
  const options = [year - 1, year, year + 1]
    .map((y) => parseDate(`${dayMonth} ${y}`))
    .filter((iso): iso is string => iso !== null);
  if (options.length === 0) return null;
  if (!previous) return parseDate(`${dayMonth} ${year}`) ?? options[0];

  const target = Date.parse(previous);
  return options.reduce((best, iso) =>
    Math.abs(Date.parse(iso) - target) < Math.abs(Date.parse(best) - target) ? iso : best,
  );
}

type LeadingDate = { iso: string | null; rest: string };

const FULL_DATE =
  /^(\d{4}-\d{2}-\d{2}|\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|\d{1,2}[ -][A-Za-z]{3,9}[ -]\d{2,4})(?=\s|$)/;
const DAY_MONTH = /^(\d{1,2})[ -]([A-Za-z]{3,9})(?=\s|$)/;

/** Reads a date at the start of a line. iso is null when the line doesn't start with one. */
function leadingDate(line: string, year: number | null, previous: string | null): LeadingDate {
  const full = FULL_DATE.exec(line);
  if (full) {
    const iso = parseDate(full[1]);
    if (iso) return { iso, rest: line.slice(full[0].length).trim() };
  }

  const short = DAY_MONTH.exec(line);
  if (short && year !== null) {
    const iso = closestYear(`${short[1]} ${short[2]}`, year, previous);
    if (iso) return { iso, rest: line.slice(short[0].length).trim() };
  }
  return { iso: null, rest: line };
}

type Money = { minor: number; signed: boolean };

/** A money token must have pence, so reference numbers aren't mistaken for amounts. */
function readMoney(token: string): Money | null {
  if (!/\.\d{2}\)?-?$/.test(token)) return null;
  const minor = parseMoneyToMinor(token);
  if (minor === null) return null;
  return { minor, signed: /^[-(+\u2212]|-$/.test(token) };
}

type Trailing = { text: string; money: Money[] };

/** Splits a line into its words and the money values at its end (at most two). */
function trailingMoney(text: string): Trailing {
  const tokens = text.split(/\s+/).filter(Boolean);
  const money: Money[] = [];

  while (tokens.length > 0 && money.length < 2) {
    const last = tokens[tokens.length - 1];
    // "95.50CR" has the marker attached; "95.50 CR" has it as a separate word
    const marker = /^(.*?)(CR|DR)$/i.exec(last);
    const attached = marker?.[1] ?? "";
    const moneyText = marker ? attached || tokens[tokens.length - 2] || "" : last;
    const used = marker && !attached ? 2 : 1;

    const value = readMoney(moneyText);
    if (!value) break;
    tokens.splice(tokens.length - used, used);

    const kind = marker?.[2].toUpperCase();
    if (kind === "DR") money.unshift({ minor: -Math.abs(value.minor), signed: true });
    else if (kind === "CR") money.unshift({ minor: Math.abs(value.minor), signed: true });
    else money.unshift(value);
  }
  return { text: tokens.join(" "), money };
}

type Item = {
  row: ParsedRow | null;
  amount: Money | null;
  balance: number | null;
};

/**
 * Gives a sign to each unsigned amount so the group adds up to the change in balance.
 * Returns null when no combination fits, or more than one does.
 */
function solveSigns(amounts: number[], fixed: number, change: number): number[] | null {
  if (amounts.length > MAX_GROUP) return null;
  let found: number[] | null = null;

  for (let mask = 0; mask < 1 << amounts.length; mask++) {
    const signed = amounts.map((a, i) => (mask & (1 << i) ? a : -a));
    const total = signed.reduce((sum, a) => sum + a, fixed);
    if (total !== change) continue;
    if (found) return null;
    found = signed;
  }
  return found;
}

/** Fills in signed amounts using the balances. Returns how many rows it resolved. */
function resolveAmounts(items: Item[], signedOnly: boolean): number {
  let resolved = 0;
  let lastBalance: number | null = null;
  let group: Item[] = [];

  for (const item of items) {
    if (item.row) group.push(item);
    if (item.balance === null) continue;

    const unsigned = group.filter((g) => g.amount && !g.amount.signed);
    const fixed = group
      .filter((g) => g.amount?.signed)
      .reduce((sum, g) => sum + (g.amount?.minor ?? 0), 0);

    if (lastBalance !== null) {
      const signs = solveSigns(
        unsigned.map((g) => Math.abs(g.amount?.minor ?? 0)),
        fixed,
        item.balance - lastBalance,
      );
      if (signs) {
        unsigned.forEach((g, i) => {
          if (g.row) g.row.amountMinor = signs[i];
        });
      }
    }
    lastBalance = item.balance;
    group = [];
  }

  for (const item of items) {
    if (!item.row || !item.amount) continue;
    if (item.amount.signed) item.row.amountMinor = item.amount.minor;
    else if (signedOnly && item.row.amountMinor === null) item.row.amountMinor = item.amount.minor;
    if (item.row.amountMinor !== null) resolved++;
  }
  return resolved;
}

function cloneItems(items: Item[]): Item[] {
  return items.map((item) => ({
    ...item,
    row: item.row ? { ...item.row, amountMinor: null } : null,
  }));
}

/** Turns the text of a PDF statement into rows, the same shape a CSV produces. */
export function analysePdfText(text: string): PdfAnalysis {
  const bank = detectBank(text);
  const empty: NormaliseResult = { rows: [], skippedZero: 0, issues: [] };
  if (!bank && !/\bstatement\b/i.test(text)) {
    return { bank, normalised: empty, ignoredLines: 0, failure: "not_a_statement" };
  }

  const year = statementYear(text);
  const lines = text.split(/\r?\n/);
  const items: Item[] = [];
  let currentDate: string | null = null;
  let pending: string[] = [];
  let ignoredLines = 0;

  lines.forEach((raw, index) => {
    const line = raw.trim();
    if (!line) return;

    const { iso, rest } = leadingDate(line, year, currentDate);
    if (iso) currentDate = iso;
    const { text: words, money } = trailingMoney(rest);

    if (BALANCE_LINE.test(line) && money.length > 0) {
      items.push({ row: null, amount: null, balance: money[money.length - 1].minor });
      pending = [];
      return;
    }

    if (money.length === 0) {
      if (iso && !words) return;
      if (currentDate && words && pending.length < 3) pending.push(words);
      else ignoredLines++;
      return;
    }

    if (!currentDate || SUMMARY_LINE.test(line)) {
      ignoredLines++;
      return;
    }

    const description = words || pending.join(" ");
    pending = [];
    const [amount, balance] = money.length === 2 ? money : [money[0], null];

    items.push({
      row: {
        rowNumber: index + 1,
        date: currentDate,
        amountMinor: null,
        moneyInMinor: null,
        moneyOutMinor: null,
        description,
        externalId: null,
        balanceMinor: balance?.minor ?? null,
      },
      amount,
      balance: balance?.minor ?? null,
    });
  });

  const transactions = items.filter((item) => item.row).length;
  if (transactions === 0) {
    return { bank, normalised: empty, ignoredLines, failure: "no_transactions" };
  }

  // With no balances anywhere, amounts must carry their own signs (as Monzo's do)
  const hasBalances = items.some((item) => item.balance !== null);
  const signedOnly = !hasBalances && items.some((item) => item.amount?.signed);

  // Try oldest-first, then newest-first, and keep whichever explains more rows
  const forward = cloneItems(items);
  const backward = cloneItems(items).reverse();
  const forwardCount = resolveAmounts(forward, signedOnly);
  const backwardCount = resolveAmounts(backward, signedOnly);
  const chosen = backwardCount > forwardCount ? backward.reverse() : forward;

  const parsed = chosen.flatMap((item) => (item.row ? [item.row] : []));
  const normalised = normaliseRows(parsed);
  const readable = normalised.rows.length + normalised.skippedZero;
  const failure = readable / parsed.length < MIN_READABLE ? "mostly_unreadable" : null;

  return { bank, normalised, ignoredLines, failure };
}