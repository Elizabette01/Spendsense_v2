"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

type SubmitButtonProps = {
  children: ReactNode;
  /** Text shown while the form is submitting, e.g. "Logging in…". */
  pendingLabel: string;
  variant?: "primary" | "outline";
  size?: "md" | "lg";
  /** Pending state from useActionState, for forms that already have it. */
  pending?: boolean;
};

/**
 * Submit button with a pending state.
 * useFormStatus reads the status of the <form> this button sits in, so it
 * works for redirecting actions too (forms that don't use useActionState).
 */
export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  size = "md",
  pending: pendingProp,
}: SubmitButtonProps) {
  const { pending: formPending } = useFormStatus();
  const pending = pendingProp ?? formPending;

  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      fullWidth
      disabled={pending}
      aria-disabled={pending}
    >
      {pending ? (
        <>
          <span
            aria-hidden="true"
            className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
