"use client";

import { useActionState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { formatDay, formatMoney, ordinal } from "@/lib/format";

import { dismissRecurring, restoreRecurring, type DismissalState } from "../actions/dismissals";
import type { RecurringItem } from "../queries";

const IDLE: DismissalState = { status: "idle" };

/**
 * The /recurring list (no design image; built from existing components).
 * "Not recurring" hides a merchant straight away, with an Undo in the status
 * message, rather than a confirm dialog. The "Hidden" section lists
 * dismissed merchants with Restore.
 */
export function RecurringManager({
  active,
  dismissed,
}: {
  active: RecurringItem[];
  dismissed: { merchantKey: string; merchant: string }[];
}) {
  const [dismissState, dismissAction, dismissing] = useActionState(dismissRecurring, IDLE);
  const [restoreState, restoreAction, restoring] = useActionState(restoreRecurring, IDLE);
  const statusRef = useRef<HTMLDivElement>(null);

  // Names for the status message (the row itself is gone once it's hidden)
  const names = new Map<string, string>([
    ...active.map((item) => [item.merchantKey, item.merchant] as const),
    ...dismissed.map((item) => [item.merchantKey, item.merchant] as const),
  ]);

  // The button that was pressed disappears with its row: move focus to the message
  useEffect(() => {
    if (dismissState.status === "done") statusRef.current?.focus();
  }, [dismissState]);

  const justDismissed =
    dismissState.status === "done" &&
    dismissed.some((item) => item.merchantKey === dismissState.merchantKey)
      ? dismissState.merchantKey
      : null;
  const error =
    (dismissState.status === "error" && dismissState.message) ||
    (restoreState.status === "error" && restoreState.message) ||
    null;

  return (
    <div className="flex flex-col gap-4">
      {/* Always in the page, so screen readers announce what appears in it */}
      <div
        ref={statusRef}
        tabIndex={-1}
        role="status"
        className="flex flex-wrap items-center gap-3 rounded-control focus-visible:outline-2 focus-visible:outline-primary"
      >
        {justDismissed && (
          <>
            <span className="text-body text-foreground">
              {names.get(justDismissed) ?? "That merchant"} hidden from recurring payments.
            </span>
            <form action={restoreAction}>
              <input type="hidden" name="merchantKey" value={justDismissed} />
              <Button type="submit" variant="outline" disabled={restoring}>
                Undo
              </Button>
            </form>
          </>
        )}
      </div>
      {error && <FormAlert tone="error">{error}</FormAlert>}

      {active.length > 0 && (
        <form action={dismissAction}>
          <ul aria-label="Recurring payments, next due first" className="flex flex-col gap-2">
            {active.map((item) => (
              <li
                key={item.merchantKey}
                className="flex flex-col gap-3 rounded-card border border-border bg-card p-4 lg:flex-row lg:items-center"
              >
                <div className="flex min-w-0 items-center gap-3 lg:w-56">
                  <span
                    aria-hidden="true"
                    className="flex size-9 shrink-0 items-center justify-center rounded-control bg-accent text-body font-semibold text-accent-foreground"
                  >
                    {item.merchant.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="text-body font-semibold break-words text-heading">{item.merchant}</p>
                    <p className="text-label text-foreground-muted">{item.categoryName ?? "Needs review"}</p>
                  </div>
                </div>

                <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
                  <Fact label="Typical amount" value={formatMoney(item.typicalAmountMinor)} strong />
                  <Fact label="Usual day" value={ordinal(item.dayOfMonth)} />
                  <Fact label="Last paid" value={formatDay(item.lastPaid)} />
                  <Fact label="Next due" value={formatDay(item.nextDue)} />
                </dl>

                <Button
                  type="submit"
                  name="merchantKey"
                  value={item.merchantKey}
                  variant="outline"
                  disabled={dismissing}
                  aria-label={`Not recurring: hide ${item.merchant}`}
                  className="self-start lg:self-center"
                >
                  Not recurring
                </Button>
              </li>
            ))}
          </ul>
        </form>
      )}

      {dismissed.length > 0 && (
        <details className="rounded-card border border-border bg-card p-4">
          <summary className="w-fit cursor-pointer rounded-control text-body font-medium text-heading focus-visible:outline-2 focus-visible:outline-primary">
            Hidden ({dismissed.length})
          </summary>
          <p className="mt-2 text-label text-foreground-muted">
            You marked these as not recurring. Restore one to show it again.
          </p>
          <form action={restoreAction}>
            <ul aria-label="Hidden merchants" className="mt-3 flex flex-col divide-y divide-divider">
              {dismissed.map((item) => (
                <li key={item.merchantKey} className="flex flex-wrap items-center justify-between gap-3 py-2">
                  <span className="text-body text-foreground">{item.merchant}</span>
                  <Button
                    type="submit"
                    name="merchantKey"
                    value={item.merchantKey}
                    variant="ghost"
                    disabled={restoring}
                    aria-label={`Restore ${item.merchant}`}
                  >
                    Restore
                  </Button>
                </li>
              ))}
            </ul>
          </form>
        </details>
      )}
    </div>
  );
}

function Fact({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex flex-col">
      <dt className="text-label text-foreground-muted">{label}</dt>
      <dd className={`text-body ${strong ? "font-semibold text-heading" : "text-foreground"}`}>{value}</dd>
    </div>
  );
}

