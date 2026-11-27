"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { plural } from "@/lib/format";

import { aiCategoriseNeedsReview, type AiCategoriseState } from "../actions/ai-categorise";

const IDLE: AiCategoriseState = { status: "idle" };

/**
 * "Categorise with AI" on the needs-review view (no design image). Runs the
 * backfill action, then reports the result in a status message.
 *
 * Stays mounted even when there's nothing left to review (`hasReview` false
 * only hides the button), so the result message isn't lost when the list
 * empties after a successful run.
 */
export function AiCategoriseButton({ hasReview }: { hasReview: boolean }) {
  const [state, action, pending] = useActionState(aiCategoriseNeedsReview, IDLE);

  return (
    <div className="flex flex-col items-start gap-2">
      {hasReview && (
        <form action={action} className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="secondary" disabled={pending}>
            <span aria-hidden="true">✦</span>
            {pending ? "Categorising…" : "Categorise with AI"}
          </Button>
          <p className="text-label text-foreground-muted">
            Sends only merchant names and whether money came in or went out.
          </p>
        </form>
      )}

      {/* Always in the page, so screen readers announce what appears in it */}
      <div role="status" className="text-body text-foreground">
        {state.status === "done" && <DoneMessage state={state} />}
      </div>

      {state.status === "error" && <FormAlert tone="error">{state.message}</FormAlert>}
    </div>
  );
}

function DoneMessage({ state }: { state: Extract<AiCategoriseState, { status: "done" }> }) {
  const left = state.stillNeedsReviewMerchantCount;
  return (
    <>
      {plural(state.updatedCount, "transaction")} categorised.{" "}
      {left === 0
        ? "Nothing left to review."
        : `${plural(left, "merchant")} still ${left === 1 ? "needs" : "need"} review.`}
    </>
  );
}
