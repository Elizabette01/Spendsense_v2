"use client";

import { useActionState, useEffect, type Ref } from "react";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { inputStyles } from "@/components/ui/input";

import { saveIncome, type OnboardingActionState } from "../actions/onboarding";
import { PoundIcon } from "./icons";
import { OnboardingCard, skipStyles } from "./onboarding-card";

const IDLE: OnboardingActionState = { status: "idle" };

/** Step 1 (onboarding 1): monthly income. "Skip for now" moves on without saving. */
export function IncomeStep({ onNext, headingRef }: { onNext: () => void; headingRef: Ref<HTMLHeadingElement> }) {
  const [state, action, pending] = useActionState(saveIncome, IDLE);

  useEffect(() => {
    if (state.status === "saved") onNext();
  }, [state, onNext]);

  return (
    <OnboardingCard
      step={1}
      headingRef={headingRef}
      skip={
        <button type="button" onClick={onNext} className={skipStyles}>
          Skip for now <span aria-hidden="true">→</span>
        </button>
      }
      icon={<PoundIcon />}
      title="What is your monthly income?"
      subtitle="This helps us work out your saving rate, so your numbers make sense next to what you earn."
    >
      <form action={action} className="flex flex-col gap-8 border-t border-dashed border-border pt-8">
        <FormField
          id="monthly-income"
          label="Monthly income"
          hint={
            <span className="inline-flex items-center gap-1 text-primary">
              <span aria-hidden="true">🔒</span> Stored securely and never shared
            </span>
          }
          error={state.status === "error" ? state.message : undefined}
        >
          {(control) => (
            <div className="relative">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-nav text-foreground-muted"
              >
                £
              </span>
              <input
                {...control}
                name="monthlyIncome"
                inputMode="numeric"
                autoComplete="off"
                placeholder="e.g. 3,200"
                maxLength={20}
                required
                className={`${inputStyles} pl-7`}
              />
            </div>
          )}
        </FormField>
        <Button type="submit" fullWidth disabled={pending}>
          {pending ? "Saving…" : "Continue"}
        </Button>
      </form>
    </OnboardingCard>
  );
}
