import { normaliseHeader } from "./columns";
import type { DateOrder } from "./dates";
import type { ColumnMapping, ColumnRole } from "./types";

export type BankProfile = {
  /** Stable id, used inside fingerprints. Never change it once released. */
  id: string;
  /** Shown to the user and saved as the statement's bank name. */
  name: string;
  /** Headers (normalised) that must all be present for this profile. */
  signature: string[];
  /** Which header (normalised) holds each role. */
  columns: Partial<Record<ColumnRole, string>>;
  /** Headers to try, in order, when the description is empty. */
  descriptionFallbacks?: string[];
  /** Header of the account-currency column, if the bank includes one. */
  currencyColumn?: string;
  dateOrder: DateOrder;
  /** Rejoins a line that the bank split by writing commas without quotes. */
  repairLine?: (line: string[], headerLength: number) => string[];
  /** False until a real file from this bank has been tried. */
  verified: boolean;
};

/** Everything past the last column belongs to it: put it back together. */
function joinOverflowIntoLastColumn(
  line: string[],
  headerLength: number,
): string[] {
  if (line.length <= headerLength) return line;
  const last = headerLength - 1;
  return [...line.slice(0, last), line.slice(last).join(", ")];
}

export const PROFILES: BankProfile[] = [
  {
    id: "monzo",
    name: "Monzo",
    signature: [
      "transactionid",
      "date",
      "name",
      "amount",
      "currency",
      "localamount",
      "moneyout",
      "moneyin",
    ],
    columns: {
      externalId: "transactionid",
      date: "date",
      description: "name",
      amount: "amount",
      moneyOut: "moneyout",
      moneyIn: "moneyin",
    },
    descriptionFallbacks: ["description", "type"],
    currencyColumn: "currency",
    dateOrder: "dmy",
    verified: true,
  },
  {
    id: "lloyds",
    name: "Lloyds Banking Group",
    signature: [
      "transactiondate",
      "transactiontype",
      "sortcode",
      "accountnumber",
      "transactiondescription",
      "debitamount",
      "creditamount",
      "balance",
    ],
    columns: {
      date: "transactiondate",
      description: "transactiondescription",
      moneyOut: "debitamount",
      moneyIn: "creditamount",
      balance: "balance",
    },
    dateOrder: "dmy",
    verified: false,
  },
  {
    id: "natwest",
    name: "NatWest Group",
    signature: [
      "date",
      "type",
      "description",
      "value",
      "balance",
      "accountname",
      "accountnumber",
    ],
    columns: {
      date: "date",
      description: "description",
      amount: "value",
      balance: "balance",
    },
    dateOrder: "dmy",
    verified: false,
  },
  {
    id: "barclays",
    name: "Barclays",
    signature: ["number", "date", "account", "amount", "subcategory", "memo"],
    columns: { date: "date", amount: "amount", description: "memo" },
    descriptionFallbacks: ["subcategory"],
    dateOrder: "dmy",
    repairLine: joinOverflowIntoLastColumn,
    verified: false,
  },
];

export function findProfile(headers: string[]): BankProfile | null {
  const present = new Set(headers.map(normaliseHeader));
  return (
    PROFILES.find((profile) =>
      profile.signature.every((name) => present.has(name)),
    ) ?? null
  );
}

/** Turns a profile's header names into column positions for this file. */
export function profileColumns(
  profile: BankProfile,
  headers: string[],
): { mapping: ColumnMapping; descriptionFallbacks: number[] } {
  const normalised = headers.map(normaliseHeader);
  const mapping: ColumnMapping = {};

  for (const [role, name] of Object.entries(profile.columns)) {
    const index = normalised.indexOf(name);
    if (index !== -1) mapping[role as ColumnRole] = index;
  }

   const descriptionFallbacks = (profile.descriptionFallbacks ?? [])
    .map((name) => normalised.indexOf(name))
    .filter((index) => index !== -1);

  return { mapping, descriptionFallbacks };
}