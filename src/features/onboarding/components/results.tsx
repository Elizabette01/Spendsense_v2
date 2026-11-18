import { monthStart } from "@/lib/finance/months";
import { formatMoneyAbs, formatMonthYear } from "@/lib/format";

import type { OnboardingSummary } from "../summary";
import { FinishButtons } from "./finish-buttons";
import { CheckIcon } from "./icons";
import { OnboardingCard } from "./onboarding-card";

function Tile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-card bg-accent p-3">
      <p className="text-label text-accent-foreground">{label}</p>
      <p className="text-card-title text-accent-foreground">{value}</p>
      <p className="text-label text-foreground-secondary">{detail}</p>
    </div>
  );
}

function monthName(key: string): string {
  return formatMonthYear(monthStart(key));
}

/** Onboarding 5: "Here is what we found", from `getOnboardingSummary()`. */
export function OnboardingResults({ summary }: { summary: OnboardingSummary }) {
  const { topCategory, recurring, saving, noticed } = summary;
  const month = monthName(summary.month);

  return (
    <OnboardingCard
      step={null}
      icon={<CheckIcon />}
      title="Here is what we found"
      subtitle={`Your statement is ready. Here are your first insights for ${month}.`}
    >
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <li>
          {/* Brief: "Top category" (the image's "Parsing transactions" label is a mistake) */}
          {topCategory ? (
            <Tile label="Top category" value={topCategory.name} detail={`${formatMoneyAbs(topCategory.amountMinor)} in ${month}`} />
          ) : (
            <Tile label="Top category" value="Not sorted yet" detail="Categorise your spending on the Transactions page" />
          )}
        </li>
        <li>
          {!recurring.enoughData ? (
            <Tile label="Recurring payments" value="Not enough data yet" detail="Needs two months of transactions" />
          ) : (
            <Tile
              label="Recurring payments"
              value={`${recurring.count} detected`}
              detail={recurring.count > 0 ? `${formatMoneyAbs(recurring.monthlyTotalMinor)}/month committed` : "None found so far"}
            />
          )}
        </li>
        <li>
          {saving ? (
            <Tile
              label="Saving rate"
              value={`${saving.ratePercent}%`}
              detail={`${formatMoneyAbs(saving.savedMinor)} ${saving.savedMinor >= 0 ? "saved" : "more out than in"}${
                saving.incomeFrom === "answer" ? ", using the income you gave us" : ""
              }`}
            />
          ) : (
            <Tile label="Saving rate" value="Not available" detail={`No income found in ${month}`} />
          )}
        </li>
      </ul>

      {noticed && (
        <p className="rounded-card border-l-4 border-brand-400 bg-brand-800 px-5 py-4 text-body text-white">
          SpendSense noticed: your {noticed.categoryName} spending in {month} was {Math.abs(noticed.changePercent)}%{" "}
          {noticed.changePercent > 0 ? "higher" : "lower"} than in {monthName(noticed.previousMonth)}.
        </p>
      )}

      <FinishButtons />
    </OnboardingCard>
  );
}
