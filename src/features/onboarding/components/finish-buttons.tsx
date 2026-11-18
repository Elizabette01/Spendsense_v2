"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/form-field";

import { completeOnboarding, type OnboardingActionState } from "../actions/onboarding";

const IDLE: OnboardingActionState = { status: "idle" };

/** "Ask the AI advisor" (not built yet) and "Go to my dashboard", which finishes onboarding. */
export function FinishButtons() {
  const [state, action, pending] = useActionState(completeOnboarding, IDLE);

  return (
    <div className="flex flex-col gap-3">
      <Button fullWidth disabled>
        Ask the AI advisor
        <span className="rounded-full bg-primary-foreground px-2 py-0.5 text-caption text-primary">
          Coming soon
        </span>
      </Button>
      <form action={action}>
        <Button type="submit" variant="secondary" fullWidth disabled={pending}>
          {pending ? "Opening your dashboard…" : "Go to my dashboard"}
        </Button>
      </form>
      {state.status === "error" && <FieldError id="finish-error">{state.message}</FieldError>}
    </div>
  );
}
