"use client";

import { useActionState, useEffect, type Ref } from "react";

import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/form-field";

import { saveGoal, type OnboardingActionState } from "../actions/onboarding";
import { GOALS, type GoalValue } from "../goals";
import { PoundIcon } from "./icons";
import { OnboardingCard, skipStyles } from "./onboarding-card";

const IDLE: OnboardingActionState = { status: "idle" };

const GOAL_SYMBOLS: Record<GoalValue, string> = {
  SAVE_MORE: "£",
  GET_OUT_OF_DEBT: "↓",
  UNDERSTAND_SPENDING: "◔",
  BUILD_WEALTH: "↗",
};

/** Step 2 (onboarding 2): main financial goal, as a radio group styled as cards. */
export function GoalStep({ onNext, headingRef }: { onNext: () => void; headingRef: Ref<HTMLHeadingElement> }) {
  const [state, action, pending] = useActionState(saveGoal, IDLE);

  useEffect(() => {
    if (state.status === "saved") onNext();
  }, [state, onNext]);

  const error = state.status === "error" ? state.message : null;

  return (
    <OnboardingCard
      step={2}
      headingRef={headingRef}
      skip={
        <button type="button" onClick={onNext} className={skipStyles}>
          Skip for now <span aria-hidden="true">→</span>
        </button>
      }
      icon={<PoundIcon />}
      title="What is your main financial goal?"
      subtitle="We'll use it to shape what SpendSense shows you first."
    >
      <form action={action} className="flex flex-col gap-8">
        <fieldset aria-describedby={error ? "goal-error" : undefined} className="flex flex-col gap-3">
          <legend className="sr-only">Main financial goal</legend>
          {GOALS.map((goal) => (
            <label
              key={goal.value}
              className="flex cursor-pointer items-center gap-4 rounded-card border border-border bg-card px-4 py-3 hover:border-primary has-checked:border-primary has-checked:bg-accent has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary"
            >
              <input type="radio" name="goal" value={goal.value} required className="sr-only" />
              <span
                aria-hidden="true"
                className="flex size-9 shrink-0 items-center justify-center rounded-icon bg-primary text-body font-semibold text-primary-foreground"
              >
                {GOAL_SYMBOLS[goal.value]}
              </span>
              <span className="flex flex-col">
                <span className="text-body font-medium text-heading">{goal.title}</span>
                <span className="text-label text-foreground-muted">{goal.description}</span>
              </span>
            </label>
          ))}
        </fieldset>
        {error && <FieldError id="goal-error">{error}</FieldError>}
        <Button type="submit" fullWidth disabled={pending}>
          {pending ? "Saving…" : "Continue"}
        </Button>
      </form>
    </OnboardingCard>
  );
}
