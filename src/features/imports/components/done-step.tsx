import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatPeriod, plural } from "@/lib/format";

import type { ImportResult } from "../actions/import-statement";

/** Step 4 (Imports — Step 4_ Done). */
export function DoneStep({ result }: { result: ImportResult }) {
  const period = formatPeriod(result.periodStart, result.periodEnd);
  const extras = [
    result.duplicateCount > 0 && `${plural(result.duplicateCount, "duplicate")} skipped`,
    result.skippedCount > 0 && `${plural(result.skippedCount, "zero-amount row")} skipped`,
    result.issueCount > 0 && `${plural(result.issueCount, "row")} couldn't be read`,
  ].filter(Boolean);

  // Review is per merchant: one fix covers all of a merchant's transactions
  const reviewMerchants = plural(result.needsReviewMerchantCount, "merchant");
  const reviewRows = `(${plural(result.needsReviewCount, "transaction")})`;
  const aiLines = [
    result.aiCategorisedCount > 0 &&
      `including ${result.aiCategorisedCount.toLocaleString("en-GB")} suggested by AI`,
    result.lowConfidenceCount > 0 &&
      `${plural(result.lowConfidenceCount, "AI guess", "AI guesses")} to check`,
  ].filter((line): line is string => Boolean(line));

  return (
    <Card className="mx-auto flex w-full max-w-170 flex-col gap-6 p-6 sm:p-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <span
          aria-hidden="true"
          className="flex size-16 items-center justify-center rounded-full bg-primary text-page-title text-primary-foreground"
        >
          ✓
        </span>
        <h2 className="text-page-title text-heading">Import complete</h2>
        <p className="text-body text-foreground-secondary">
          {period ? `Your ${period} statement is ready.` : "Your statement is ready."}
        </p>
      </div>

      <dl className="grid grid-cols-3 divide-x divide-divider border-y border-divider py-4 text-center">
        <Stat label="Transactions" value={result.importedCount} />
        <Stat label="Categorised" value={result.categorisedCount} details={aiLines} />
        <Stat
          label="Need review"
          value={result.needsReviewMerchantCount}
          unit={result.needsReviewMerchantCount === 1 ? "merchant" : "merchants"}
          details={result.needsReviewCount > 0 ? [reviewRows] : []}
        />
      </dl>

      {extras.length > 0 && (
        <p className="text-center text-label text-foreground-muted">{extras.join(" · ")}</p>
      )}

      {result.needsReviewCount > 0 && (
        <div className="flex items-start gap-3 rounded-control bg-coral-light px-4 py-3 text-coral-strong">
          <span aria-hidden="true">⚠</span>
          <div>
            <p className="text-body font-semibold">
              {reviewMerchants} {reviewRows} {result.needsReviewMerchantCount === 1 ? "needs" : "need"}{" "}
              your review
            </p>
            <p className="text-label">
              {result.needsReviewMerchantCount === 1 ? "It" : "These"} couldn&apos;t be categorised
              automatically. Choose a category once per merchant and it covers all of its
              transactions.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/dashboard" size="lg" className="sm:flex-1">
          Go to dashboard <span aria-hidden="true">→</span>
        </ButtonLink>
        <ButtonLink href="/transactions?review=1" variant="secondary" size="lg" className="sm:flex-1">
          Review transactions
        </ButtonLink>
      </div>
    </Card>
  );
}

function Stat({
  label,
  value,
  unit,
  details = [],
}: {
  label: string;
  value: number;
  /** Shown after the number, e.g. "merchants". */
  unit?: string;
  /** Smaller lines under the figure. */
  details?: string[];
}) {
  return (
    <div className="flex flex-col gap-1 px-2">
      <dt className="order-last text-label text-foreground-muted">{label}</dt>
      <dd className="flex flex-col items-center gap-0.5">
        <span className="text-stat text-heading">
          {value.toLocaleString("en-GB")}
          {unit && <span className="text-body font-medium text-foreground-secondary"> {unit}</span>}
        </span>
        {details.map((line) => (
          <span key={line} className="text-label text-foreground-muted">
            {line}
          </span>
        ))}
      </dd>
    </div>
  );
}
