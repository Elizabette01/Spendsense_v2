import { formatMoney } from "@/lib/format";

import type { Card } from "../build";

type Tone = "up-is-good" | "up-is-bad";

/** The four figures across the top (dashboard design; first card is "Net balance"). */
export function SummaryCards({
  cards,
  previousMonthName,
}: {
  cards: { netBalance: Card; income: Card; expenses: Card; savings: Card };
  previousMonthName: string;
}) {
  return (
    <section aria-label="Summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Figure label="Net balance" icon="£" card={cards.netBalance} tone="up-is-good" previous={previousMonthName} />
      <Figure label="Income" icon="↓" card={cards.income} tone="up-is-good" previous={previousMonthName} />
      <Figure label="Expenses" icon="↑" card={cards.expenses} tone="up-is-bad" previous={previousMonthName} />
      <Figure label="Savings" icon="★" card={cards.savings} tone="up-is-good" previous={previousMonthName} />
    </section>
  );
}

function Figure({
  label,
  icon,
  card,
  tone,
  previous,
}: {
  label: string;
  icon: string;
  card: Card;
  tone: Tone;
  previous: string;
}) {
  const change = card.changePercent;
  const up = change !== null && change > 0;
  const good = change === null || change === 0 ? null : tone === "up-is-good" ? up : !up;

  return (
    <div className="flex flex-col gap-1 rounded-card bg-card p-5 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <p className="text-body text-foreground-muted">{label}</p>
        <span
          aria-hidden="true"
          className={`flex size-7 items-center justify-center rounded-icon text-label font-semibold ${
            tone === "up-is-bad" ? "bg-coral-light text-coral-strong" : "bg-accent text-accent-foreground"
          }`}
        >
          {icon}
        </span>
      </div>
      <p className="text-stat text-heading">{formatMoney(card.valueMinor)}</p>
      {change !== null && (
        <p
          className={`text-label ${
            good === null ? "text-foreground-muted" : good ? "text-positive" : "text-destructive"
          }`}
        >
          <span aria-hidden="true">{up ? "↑" : change < 0 ? "↓" : "→"} </span>
          <span className="sr-only">{up ? "Up" : change < 0 ? "Down" : "No change,"} </span>
          {Math.abs(change).toFixed(1)}% vs {previous}
        </p>
      )}
    </div>
  );
}
