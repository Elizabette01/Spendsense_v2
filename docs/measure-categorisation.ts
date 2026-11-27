/**
 * Measures how many merchants and rows a statement would leave "needs review",
 * as a brand-new user (no merchant rules yet) would see it.
 *
 * PRIVACY: prints COUNTS ONLY. It never prints, logs or saves merchant names,
 * descriptions, dates or amounts. Keep real statements OUTSIDE the repo.
 *
 * Usage (from the project root):
 *   npx tsx scripts/measure-categorisation.ts "C:\path\outside\repo\statement.csv"
 */

import { readFileSync } from "node:fs";

import { analyseGrid } from "../src/features/imports/parsers/analyse";
import { readCsv } from "../src/features/imports/parsers/csv";
import { categoriseRows } from "../src/lib/categorisation/categorise";
import { merchantKey } from "../src/lib/categorisation/merchant";

const TARGET_MERCHANTS = 5;

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

const path = process.argv[2];
if (!path) fail("Usage: npx tsx scripts/measure-categorisation.ts <path-to-csv>");

// 1. Read and parse exactly as the import does (CSV only for now)
const read = readCsv(new Uint8Array(readFileSync(path)));
if (!read.ok) fail(`Could not read the file: ${read.reason}`);

const analysis = analyseGrid(read.grid);
if (analysis.failure) fail(`Not read as a statement: ${analysis.failure}`);

const rows = analysis.normalised.rows;

// 2. Categorise with no user rules (a new user's first import)
const decisions = categoriseRows(rows, []);

// 3. Count. A "merchant" is a merchant key plus direction, because
//    "amazon" money out and "amazon" money in are reviewed separately.
let ruleRows = 0;
let reviewRows = 0;
const allMerchants = new Set<string>();
const reviewMerchants = new Map<string, number>(); // key -> row count

decisions.forEach((decision, i) => {
  const direction = rows[i].amountMinor < 0 ? "out" : "in";
  const key = `${merchantKey(decision.merchant)}|${direction}`;
  allMerchants.add(key);

  if (decision.categoryId === null) {
    reviewRows += 1;
    reviewMerchants.set(key, (reviewMerchants.get(key) ?? 0) + 1);
  } else {
    ruleRows += 1;
  }
});

const reviewOut = [...reviewMerchants.keys()].filter((k) => k.endsWith("|out")).length;
const reviewIn = reviewMerchants.size - reviewOut;
const seenOnce = [...reviewMerchants.values()].filter((n) => n === 1).length;
const percent = (part: number, whole: number) =>
  whole === 0 ? "0%" : `${Math.round((part / whole) * 100)}%`;

// 4. Report: numbers only
console.log("Rows imported:              ", rows.length);
console.log("Categorised by rules:       ", ruleRows, `(${percent(ruleRows, rows.length)})`);
console.log("Rows needing review:        ", reviewRows, `(${percent(reviewRows, rows.length)})`);
console.log("Unique merchants:           ", allMerchants.size);
console.log("Merchants needing review:   ", reviewMerchants.size, `(target ${TARGET_MERCHANTS} or fewer)`);
console.log("  of which money out:       ", reviewOut);
console.log("  of which money in:        ", reviewIn);
console.log("  seen only once:           ", seenOnce);
