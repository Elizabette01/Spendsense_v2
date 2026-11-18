/**
 * Plain-English wording for every import failure, chosen by `reason`.
 * Unknown reasons fall back to the server's own message.
 */

export type FailureCopy = { title: string; body: string };

const NOT_A_STATEMENT: FailureCopy = {
  title: "This doesn't look like a bank statement",
  body: "We couldn't find dated transactions with amounts. Download a statement from your bank as CSV, Excel or PDF and try again.",
};

const WRONG_TYPE: FailureCopy = {
  title: "That file type isn't supported",
  body: "Upload a bank statement as a CSV, Excel (.xlsx or .xls) or PDF file.",
};

const COPY: Record<string, FailureCopy> = {
  wrong_file_type: WRONG_TYPE,
  not_spreadsheet: WRONG_TYPE,
  not_text: WRONG_TYPE,
  not_pdf: WRONG_TYPE,
  too_large: {
    title: "That file is too large",
    body: "Statements can be up to 4 MB. Try exporting a shorter date range from your bank.",
  },
  empty: {
    title: "That file is empty",
    body: "The file has nothing in it. Check you picked the right file and try again.",
  },
  too_many_rows: {
    title: "That file has too many rows",
    body: "We can read up to 20,000 transactions in one file. Export a shorter date range and upload it in parts.",
  },
  too_many_pages: {
    title: "That PDF is too long",
    body: "We can read PDFs of up to 50 pages. Export a shorter date range from your bank.",
  },
  password_protected: {
    title: "That PDF is password-protected",
    body: "We can't open protected files. Save a copy without a password, or download a CSV from your bank.",
  },
  no_text: {
    title: "We can't read this PDF",
    body: "It looks like a scanned image with no text in it. Download a CSV, Excel or text PDF statement from your bank instead.",
  },
  not_a_statement: NOT_A_STATEMENT,
  no_transactions: NOT_A_STATEMENT,
  mostly_unreadable: NOT_A_STATEMENT,
  conflicting_dates: NOT_A_STATEMENT,
  no_date_column: NOT_A_STATEMENT,
  no_amount_column: NOT_A_STATEMENT,
  not_gbp: {
    title: "Only pounds sterling for now",
    body: "SpendSense reads statements in GBP. This file has transactions in another currency.",
  },
  rate_limited: {
    title: "Too many uploads",
    body: "You've uploaded a lot in the last hour. Please try again later.",
  },
  signed_out: {
    title: "Please sign in again",
    body: "Your session has ended. Sign in, then upload your statement again.",
  },
  needs_decision: {
    title: "Something changed",
    body: "Something changed since the preview. Please check the file again.",
  },
  nothing_to_import: {
    title: "Nothing new to import",
    body: "Every transaction in this file was skipped, so nothing was saved.",
  },
  conflict: {
    title: "Please try again",
    body: "Another import of the same transactions finished at the same moment. Nothing was saved from this one.",
  },
};

/** Statement-level failures that, after a column change, mean "that choice didn't work". */
const COLUMN_PROBLEMS = new Set([
  "not_a_statement",
  "no_transactions",
  "mostly_unreadable",
  "conflicting_dates",
  "no_date_column",
  "no_amount_column",
]);

const COLUMN_CHOICE: FailureCopy = {
  title: "That column choice didn't work",
  body: "We couldn't read transactions with that choice, so your previous choices are kept. Try a different column.",
};

export function failureCopy(reason: string, message: string, fromRemap = false): FailureCopy {
  if (fromRemap && COLUMN_PROBLEMS.has(reason)) return COLUMN_CHOICE;
  return COPY[reason] ?? { title: "Something went wrong", body: message };
}
