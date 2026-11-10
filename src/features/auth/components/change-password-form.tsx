"use client";

import { useActionState, useEffect, useRef } from "react";
import { changePassword, type ChangePasswordState } from "../actions/change-password";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/password-rules";
import { FormAlert } from "@/components/ui/form-alert";
import { FormField } from "@/components/ui/form-field";
import { PasswordInput } from "./password-input";
import { SubmitButton } from "./submit-button";

const initialState: ChangePasswordState = { status: "idle" };

/**
 * Change password (styled like the Figma Settings "Profile" section).
 * On success the server signs out every device and redirects to
 * /login?status=password-changed, so there's no success state here.
 */
export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  // After a failed submit, focus the first field with an error, else the alert.
  useEffect(() => {
    if (state.status !== "error") return;
    const firstInvalid = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    (firstInvalid ?? alertRef.current)?.focus();
  }, [state]);

  const errors = state.status === "error" ? state.fieldErrors : undefined;

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-5">
      {state.status === "error" && (
        <FormAlert tone="error" ref={alertRef}>
          {/* Shown as-is: includes the Google-only account message from the server */}
          {state.message}
        </FormAlert>
      )}

      <div className="flex max-w-200 flex-col gap-4">
        <FormField
          id="current-password"
          label="Current password"
          error={errors?.currentPassword?.[0]}
        >
          {(control) => (
            <PasswordInput
              {...control}
              name="currentPassword"
              autoComplete="current-password"
              required
            />
          )}
        </FormField>

        <FormField
          id="new-password"
          label="New password"
          hint={`Use ${PASSWORD_MIN_LENGTH} to ${PASSWORD_MAX_LENGTH} characters. Longer passphrases are great.`}
          error={errors?.newPassword?.[0]}
        >
          {(control) => (
            <PasswordInput {...control} name="newPassword" autoComplete="new-password" required />
          )}
        </FormField>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-nav text-foreground-muted">
          You&apos;ll be signed out on all devices, including this one, and asked to log in
          again with your new password.
        </p>
        <div className="sm:w-48 sm:shrink-0">
          <SubmitButton pending={pending} pendingLabel="Changing…">
            Change password
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
