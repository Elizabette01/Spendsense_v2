/**
 * Measures how many merchants and rows a statement would leave "needs review",
 * as a brand-new user (no merchant rules yet) would see it.
 *
 * PRIVACY: prints COUNTS ONLY. It never prints, logs or saves merchant names,
 * descriptions, dates or amounts. Keep real statements OUTSIDE the repo.
 * With --ai, cleaned merchant names and directions are sent to Anthropic,
 * exactly as an import would send them.
 *
 * Usage (from the project root):
 *   Rules only:
 *     npx tsx --conditions=react-server scripts/measure-categorisation.ts "C:\path\outside\repo\statement.csv"
 *   Rules + AI (needs ANTHROPIC_API_KEY in .env.local):
 *     npx tsx --conditions=react-server --env-file=.env.local scripts/measure-categorisation.ts --ai "C:\path\outside\repo\statement.csv"
 *
 * Why --conditions=react-server: the categoriser imports `server-only`, which
 * throws anywhere except a Next.js server. This flag makes Node pick that
 * package's empty server version, the same one Next.js itself uses, so the
 * script runs without weakening the protection inside the app.
 */

import { readFileSync } from "node:fs";

import { analyseGrid } from "../src/features/imports/parsers/analyse";
import { readCsv } from "../src/features/imports/parsers/csv";
import { getAnthropic } from "../src/lib/ai/client";
import { categoriseRows, directionOf } from "../src/lib/categorisation/categorise";
import { merchantKey } from "../src/lib/categorisation/merchant";

const TARGET_MERCHANTS = 5;

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

async function main() {
  const args = process.argv.slice(2);
  const useAi = args.includes("--ai");
  const path = args.find((arg) => !arg.startsWith("--"));
  if (!path) {
    fail("Usage: npx tsx --conditions=react-server scripts/measure-categorisation.ts [--ai] <path-to-csv>");
  }
  if (useAi && !getAnthropic()) {
    fail("--ai needs ANTHROPIC_API_KEY. Add --env-file=.env.local to the command.");
  }

  // 1. Read and parse exactly as the import does (CSV only for now)
  const read = readCsv(new Uint8Array(readFileSync(path)));
  if (!read.ok) fail(`Could not read the file: ${read.reason}`);

  const analysis = analyseGrid(read.grid);
  if (analysis.failure) fail(`Not read as a statement: ${analysis.failure}`);

  const rows = analysis.normalised.rows;

  // 2. Categorise with no saved rules (a new user's first import).
  //    Without --ai, the live AI step is switched off.
  const { decisions } = await categoriseRows(rows, [], useAi ? {} : { ai: false });

  // 3. Count. A "merchant" is a merchant key plus direction, because
  //    "amazon" money out and "amazon" money in are reviewed separately.
  let ruleRows = 0;
  let aiRows = 0;
  let lowConfidenceRows = 0;
  let reviewRows = 0;
  const allMerchants = new Set<string>();
  const reviewMerchants = new Map<string, number>(); // key -> row count

  decisions.forEach((decision, i) => {
    const key = `${merchantKey(decision.merchant)}|${directionOf(rows[i].amountMinor)}`;
    allMerchants.add(key);

    if (decision.categoryId === null) {
      reviewRows += 1;
      reviewMerchants.set(key, (reviewMerchants.get(key) ?? 0) + 1);
    } else if (decision.categorisedBy === "AI") {
      aiRows += 1;
      if (decision.lowConfidence) lowConfidenceRows += 1;
    } else {
      ruleRows += 1;
    }
  });

  const reviewOut = [...reviewMerchants.keys()].filter((k) => k.endsWith("|OUT")).length;
  const reviewIn = reviewMerchants.size - reviewOut;
  const seenOnce = [...reviewMerchants.values()].filter((n) => n === 1).length;
  const percent = (part: number, whole: number) =>
    whole === 0 ? "0%" : `${Math.round((part / whole) * 100)}%`;

  // 4. Report: numbers only
  console.log("Mode:                       ", useAi ? "rules + AI" : "rules only");
  console.log("Rows imported:              ", rows.length);
  console.log("Categorised by rules:       ", ruleRows, `(${percent(ruleRows, rows.length)})`);
  console.log("Categorised by AI:          ", aiRows, `(${percent(aiRows, rows.length)})`);
  console.log("  of which low confidence:  ", lowConfidenceRows);
  console.log("Rows needing review:        ", reviewRows, `(${percent(reviewRows, rows.length)})`);
  console.log("Unique merchants:           ", allMerchants.size);
  console.log("Merchants needing review:   ", reviewMerchants.size, `(target ${TARGET_MERCHANTS} or fewer)`);
  console.log("  of which money out:       ", reviewOut);
  console.log("  of which money in:        ", reviewIn);
  console.log("  seen only once:           ", seenOnce);
}

main().catch((error: unknown) => {
  // Only the error's name: messages could contain statement contents
  console.error("Failed:", error instanceof Error ? error.name : "unknown error");
  process.exit(1);
});
