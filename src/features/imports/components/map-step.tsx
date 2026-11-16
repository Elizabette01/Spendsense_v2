"use client";

import { useId, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { formatDay, formatMoney, formatMoneyAbs, plural } from "@/lib/format";

import type { ColumnRole, RowIssueReason } from "../parsers/types";
import type { ColumnMappingInput, DuplicateDecisions } from "../schemas";
import type { PreviewColumns, StatementPreview } from "../server/build-preview";
import {
  DuplicatesSection,
  initialDuplicateChoices,
  type DuplicateChoices,
} from "./duplicates-section";

const ROLE_OPTIONS: { value: ColumnRole | ""; label: string }[] = [
  { value: "date", label: "Date" },
  { value: "description", label: "Description" },
  { value: "amount", label: "Amount" },
  { value: "moneyIn", label: "Money in" },
  { value: "moneyOut", label: "Money out" },
  { value: "balance", label: "Balance" },
  { value: "externalId", label: "Transaction ID" },
  { value: "", label: "Skip" },
];

const ISSUE_TEXT: Record<RowIssueReason, string> = {
  missing_date: "no readable date",
  missing_amount: "no readable amount",
  both_in_and_out: "both money in and money out are filled in",
  amount_mismatch: "the amount doesn't match money in and out",
};

const NEEDS_MAPPING_TEXT = {
  no_date_column: "We couldn't find the date column. Choose which column holds the date.",
  no_amount_column:
    "We couldn't find the amount. Choose the Amount column, or the Money in and Money out columns.",
} as const;

type MapStepProps = {
  file: File;
  preview: StatementPreview;
  pending: boolean;
  onRemap: (change: { mapping?: ColumnMappingInput; dateOrder?: "dmy" | "mdy" }) => void;
  onBack: () => void;
  onConfirm: (decisions: DuplicateDecisions) => void;
};

/** Step 2 (Imports — Step 2_ Map Columns), plus summary, sample, issues and duplicates. */
export function MapStep({ file, preview, pending, onRemap, onBack, onConfirm }: MapStepProps) {
  const [choices, setChoices] = useState<DuplicateChoices>(() =>
    initialDuplicateChoices(preview.flagged),
  );
  const reasonId = useId();

  const { columns, summary } = preview;
  const undecided = preview.flagged.filter((row) => choices[row.fingerprint] === undefined).length;
  const blocker = columns?.needsMapping
    ? "Choose the missing column first."
    : undecided > 0
      ? `Choose Skip or Import for ${plural(undecided, "flagged row")}.`
      : null;

  const changeRole = (index: number, role: ColumnRole | "") => {
    if (!columns) return;
    const mapping: ColumnMappingInput = {};
    for (const item of columns.items) {
      // The chosen role moves to this column; a column can only have one role
      const next = item.index === index ? role : item.role === role ? "" : item.role;
      if (next) mapping[next] = item.index;
    }
    onRemap({ mapping });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* File bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-accent px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-body font-semibold text-heading">{preview.fileName}</p>
          <p className="text-label text-foreground-secondary">
            {Math.max(1, Math.round(file.size / 1024))} KB <span aria-hidden="true">·</span>{" "}
            Read successfully
          </p>
        </div>
        <Button variant="outline" onClick={onBack} disabled={pending}>
          Change file
        </Button>
      </div>

      {/* Summary */}
      <section aria-label="Statement summary" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Fact label="Bank" value={preview.bankName ?? "Not recognised"} />
        <Fact label="Transactions" value={summary.rowCount.toLocaleString("en-GB")} />
        <Fact
          label="Dates"
          value={
            summary.dateFrom && summary.dateTo
              ? `${formatDay(summary.dateFrom)} to ${formatDay(summary.dateTo)}`
              : "None found"
          }
          wide
        />
        <Fact label="Money in" value={formatMoneyAbs(summary.moneyInMinor)} />
        <Fact label="Money out" value={formatMoneyAbs(summary.moneyOutMinor)} />
        <Fact label="Zero rows skipped" value={summary.skippedZero.toLocaleString("en-GB")} />
      </section>

      {columns?.needsMapping && (
        <FormAlert tone="error">{NEEDS_MAPPING_TEXT[columns.needsMapping]}</FormAlert>
      )}

      {columns ? (
        <ColumnTable columns={columns} pending={pending} onRoleChange={changeRole} />
      ) : (
        <p className="text-body text-foreground-secondary">
          PDF statements don&apos;t have columns to match. Check the sample below looks right.
        </p>
      )}

      {columns && !columns.dateOrderCertain && (
        <fieldset
          disabled={pending}
          className="flex flex-col gap-2 rounded-card bg-card p-4 shadow-card"
        >
          <legend className="float-left mb-1 text-card-title text-heading">
            How are dates written in this file?
          </legend>
          {(
            [
              ["dmy", "Day first (03/04/2026 is 3 April)"],
              ["mdy", "Month first (03/04/2026 is 4 March)"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="clear-left flex items-center gap-2 text-body text-foreground">
              <input
                type="radio"
                name="dateOrder"
                checked={columns.dateOrder === value}
                onChange={() => onRemap({ dateOrder: value })}
                className="size-4 accent-primary"
              />
              {label}
            </label>
          ))}
        </fieldset>
      )}

      <SampleTable preview={preview} />

      {preview.issues.length > 0 && (
        <section className="flex flex-col gap-2 rounded-card bg-card p-4 shadow-card sm:p-6">
          <h2 className="text-card-title text-heading">
            {plural(preview.issues.length, "row")} couldn&apos;t be read
          </h2>
          <p className="text-body text-foreground-secondary">
            These rows won&apos;t be imported. Check them against your statement.
          </p>
          <ul className="max-h-48 overflow-y-auto text-body text-foreground">
            {preview.issues.map((issue) => (
              <li key={issue.rowNumber}>
                Row {issue.rowNumber}: {ISSUE_TEXT[issue.reason]}
              </li>
            ))}
          </ul>
        </section>
      )}

      {preview.flagged.length > 0 && (
        <DuplicatesSection
          rows={preview.flagged}
          choices={choices}
          onChange={setChoices}
          disabled={pending}
        />
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        {blocker && (
          <p id={reasonId} className="text-label text-foreground-muted sm:mr-auto">
            {blocker}
          </p>
        )}
        <Button variant="outline" onClick={onBack} disabled={pending}>
          <span aria-hidden="true">←</span> Back
        </Button>
        <Button
          onClick={() =>
            onConfirm({
              overrides: Object.fromEntries(
                Object.entries(choices).filter(
                  (entry): entry is [string, "skip" | "import"] => entry[1] !== undefined,
                ),
              ),
            })
          }
          disabled={pending || blocker !== null}
          aria-describedby={blocker ? reasonId : undefined}
        >
          {pending ? "Checking…" : "Confirm mapping"} <span aria-hidden="true">→</span>
        </Button>
      </div>
    </div>
  );
}

function Fact({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`rounded-card bg-card px-3 py-2 shadow-card ${wide ? "col-span-2" : ""}`}>
      <p className="text-label text-foreground-muted">{label}</p>
      <p className="text-body font-semibold text-heading">{value}</p>
    </div>
  );
}

function ColumnTable({
  columns,
  pending,
  onRoleChange,
}: {
  columns: PreviewColumns;
  pending: boolean;
  onRoleChange: (index: number, role: ColumnRole | "") => void;
}) {
  return (
    <section aria-labelledby="columns-heading" className="flex flex-col gap-3">
      <h2 id="columns-heading" className="text-body text-foreground-secondary">
        We found {plural(columns.items.length, "column")} in your file. Confirm or change how
        each one is read.
      </h2>
      <div className="overflow-x-auto rounded-card bg-card shadow-card">
        <table className="w-full min-w-150 text-left">
          <thead>
            <tr className="border-b border-divider text-label text-foreground-muted">
              <th scope="col" className="px-4 py-3 font-normal sm:px-6">Column in file</th>
              <th scope="col" className="px-4 py-3 font-normal">Read as</th>
              <th scope="col" className="px-4 py-3 font-normal">Sample</th>
              <th scope="col" className="px-4 py-3 font-normal sm:px-6">Status</th>
            </tr>
          </thead>
          <tbody>
            {columns.items.map((item) => {
              const selectId = `column-${item.index}`;
              return (
                <tr key={item.index} className="border-b border-divider last:border-0">
                  <th scope="row" className="px-4 py-3 text-body font-normal text-foreground sm:px-6">
                    <label htmlFor={selectId}>{item.header}</label>
                  </th>
                  <td className="px-4 py-3">
                    <select
                      id={selectId}
                      value={item.role ?? ""}
                      disabled={pending}
                      onChange={(event) =>
                        onRoleChange(item.index, event.target.value as ColumnRole | "")
                      }
                      className={`w-40 rounded-control border px-2 py-1.5 text-body focus-visible:outline-2 focus-visible:outline-primary ${
                        item.uncertain
                          ? "border-coral-strong bg-coral-light text-coral-strong"
                          : "border-foreground-subtle bg-accent text-accent-foreground"
                      }`}
                    >
                      {ROLE_OPTIONS.map((option) => (
                        <option key={option.label} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-body text-foreground-secondary">
                    {item.sampleHidden ? (
                      <span className="italic">Hidden for privacy</span>
                    ) : (
                      (item.sample ?? <span aria-label="No sample">—</span>)
                    )}
                  </td>
                  <td className="px-4 py-3 sm:px-6">
                    {item.role === null ? (
                      <Badge tone="neutral" icon="–">Skipping</Badge>
                    ) : item.uncertain ? (
                      <Badge tone="warning" icon="⚠">Please check</Badge>
                    ) : (
                      <Badge tone="success" icon="✓">Matched</Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SampleTable({ preview }: { preview: StatementPreview }) {
  if (preview.sample.length === 0) return null;
  return (
    <section aria-labelledby="sample-heading" className="flex flex-col gap-3">
      <h2 id="sample-heading" className="text-card-title text-heading">
        First {plural(preview.sample.length, "transaction")}, as we read them
      </h2>
      <div className="max-h-96 overflow-auto rounded-card bg-card shadow-card">
        <table className="w-full min-w-120 text-left">
          <thead className="sticky top-0 bg-card">
            <tr className="border-b border-divider text-label text-foreground-muted">
              <th scope="col" className="px-4 py-2 font-normal sm:px-6">Date</th>
              <th scope="col" className="px-4 py-2 font-normal">Description</th>
              <th scope="col" className="px-4 py-2 text-right font-normal sm:px-6">Amount</th>
            </tr>
          </thead>
          <tbody>
            {preview.sample.map((row) => (
              <tr key={row.rowNumber} className="border-b border-divider text-body last:border-0">
                <td className="px-4 py-2 whitespace-nowrap text-foreground-secondary sm:px-6">
                  {formatDay(row.date)}
                </td>
                <td className="px-4 py-2 text-foreground">{row.description}</td>
                <td
                  className={`px-4 py-2 text-right whitespace-nowrap sm:px-6 ${
                    row.amountMinor > 0 ? "text-positive" : "text-heading"
                  }`}
                >
                  {formatMoney(row.amountMinor)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
