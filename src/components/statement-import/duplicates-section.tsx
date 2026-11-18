"use client";

import { useId } from "react";

import { Button } from "@/components/ui/button";
import { formatDay, formatMoney, plural } from "@/lib/format";

import type { DuplicateChoice } from "@/features/imports/schemas";
import type { FlaggedPreviewRow } from "@/features/imports/server/build-preview";

export type DuplicateChoices = Record<string, DuplicateChoice | undefined>;

/**
 * Rows already imported. Matched by the bank's own transaction ID → start as "skip";
 * matched by date, amount and description → start undecided, because two identical
 * coffees on one day can both be real.
 */
export function initialDuplicateChoices(rows: readonly FlaggedPreviewRow[]): DuplicateChoices {
  return Object.fromEntries(
    rows.map((row) => [row.fingerprint, row.matchedBy === "id" ? "skip" : undefined]),
  );
}

type Props = {
  rows: readonly FlaggedPreviewRow[];
  choices: DuplicateChoices;
  onChange: (choices: DuplicateChoices) => void;
  disabled: boolean;
};

/** No design image: built from the mapping table's card and row styles. */
export function DuplicatesSection({ rows, choices, onChange, disabled }: Props) {
  const headingId = useId();
  const undecided = rows.filter((row) => choices[row.fingerprint] === undefined).length;

  const setAll = (choice: DuplicateChoice) =>
    onChange(Object.fromEntries(rows.map((row) => [row.fingerprint, choice])));

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-4 rounded-card bg-card p-4 shadow-card sm:p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 id={headingId} className="text-card-title text-heading">
          {plural(rows.length, "transaction")} match an earlier import
        </h2>
        <p className="text-body text-foreground-secondary">
          Nothing is removed without your say. Skip a row if you&apos;ve already imported it,
          or import it if it&apos;s a separate payment (for example, two identical coffees on
          the same day).
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" onClick={() => setAll("skip")} disabled={disabled}>
          Skip all
        </Button>
        <Button variant="outline" onClick={() => setAll("import")} disabled={disabled}>
          Import all
        </Button>
        <p role="status" className="text-label text-foreground-muted">
          {undecided === 0 ? "Every row has a choice." : `${plural(undecided, "row")} still need a choice.`}
        </p>
      </div>

      <ul className="flex max-h-96 flex-col divide-y divide-divider overflow-y-auto rounded-control border border-border">
        {rows.map((row) => {
          const choice = choices[row.fingerprint];
          const name = `duplicate-${row.fingerprint}`;
          return (
            <li
              key={row.fingerprint}
              className={`flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between ${
                choice === undefined ? "bg-coral-light/60" : ""
              }`}
            >
              <div className="min-w-0">
                <p className="truncate text-body text-foreground">{row.description}</p>
                <p className="text-label text-foreground-muted">
                  {formatDay(row.date)} <span aria-hidden="true">·</span>{" "}
                  {formatMoney(row.amountMinor)} <span aria-hidden="true">·</span>{" "}
                  {row.matchedBy === "id" ? "Same transaction ID" : "Same date, amount and description"}
                </p>
              </div>
              <fieldset className="flex shrink-0 gap-4" disabled={disabled}>
                <legend className="sr-only">
                  {row.description}, {formatDay(row.date)}, {formatMoney(row.amountMinor)}
                </legend>
                {(["skip", "import"] as const).map((option) => (
                  <label key={option} className="flex items-center gap-1.5 text-body text-foreground">
                    <input
                      type="radio"
                      name={name}
                      value={option}
                      checked={choice === option}
                      onChange={() => onChange({ ...choices, [row.fingerprint]: option })}
                      className="size-4 accent-primary"
                    />
                    {option === "skip" ? "Skip" : "Import"}
                  </label>
                ))}
              </fieldset>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
