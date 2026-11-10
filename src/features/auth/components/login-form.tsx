"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { signInWithPassword, type SignInState } from "../actions/sign-in";
import { FormAlert } from "@/components/ui/form-alert";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "./password-input";
import { SubmitButton } from "./submit-button";

const initialState: SignInState = { status: "idle" };

/** Email + password sign-in (Figma "Login-page" form). */
export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, formAction, pending] = useActionState(signInWithPassword, initialState);
  const alertRef = useRef<HTMLDivElement>(null);
  // React resets the form after each submit; keeping the email in state means
  // it stays filled in after an error. (Kept in memory only, never stored.)
  const [email, setEmail] = useState("");

  // After a failed submit, move focus to the error so it's announced.
  useEffect(() => {
    if (state.status === "error") alertRef.current?.focus();
  }, [state]);

  return (
    <form action={formAction} className="flex w-full flex-col gap-6">
      {state.status === "error" && (
        <FormAlert tone="error" ref={alertRef}>
          {state.message}
        </FormAlert>
      )}

      {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}

      <FormField id="login-email" label="Email address">
        {(control) => (
          <Input
            {...control}
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        )}
      </FormField>

      <FormField id="login-password" label="Password">
        {(control) => (
          <PasswordInput
            {...control}
            name="password"
            autoComplete="current-password"
            required
          />
        )}
      </FormField>

      <Link
        href="/forgot-password"
        className="self-start rounded-control text-nav text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Forgot password?
      </Link>

      <SubmitButton pending={pending} pendingLabel="Logging in…">
        Log in
      </SubmitButton>
    </form>
  );
}
