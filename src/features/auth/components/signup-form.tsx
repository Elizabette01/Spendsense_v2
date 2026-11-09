"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState, type ChangeEvent } from "react";
import { register, type RegisterState } from "../actions/register";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/password-rules";
import { ButtonLink } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { AuthHeading } from "./auth-split-card";
import { GoogleButton, OrDivider } from "./google-button";
import { PasswordInput } from "./password-input";
import { SubmitButton } from "./submit-button";

const initialState: RegisterState = { status: "idle" };

const linkStyles =
  "rounded-control font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/** Sign-up form (Figma "Signup-page"), swapped for "Check your email" on success. */
export function SignupForm() {
  const [state, formAction, pending] = useActionState(register, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  // Keep typed values after an error (React resets forms after each submit).
  // Held in memory only; never stored. Passwords are deliberately not kept.
  const [values, setValues] = useState({ firstName: "", lastName: "", email: "" });
  const update = (field: keyof typeof values) => (event: ChangeEvent<HTMLInputElement>) =>
    setValues((current) => ({ ...current, [field]: event.target.value }));

  // After a failed submit, focus the first field with an error, else the alert.
  useEffect(() => {
    if (state.status !== "error") return;
    const firstInvalid = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    (firstInvalid ?? alertRef.current)?.focus();
  }, [state]);

  if (state.status === "success") return <CheckYourEmail />;

  const errors = state.status === "error" ? state.fieldErrors : undefined;

  return (
    <>
      <AuthHeading title="Create an account">
        Already have an account?{" "}
        <Link href="/login" className={linkStyles}>
          Log in
        </Link>
      </AuthHeading>

      <form ref={formRef} action={formAction} className="flex w-full flex-col gap-6">
        {state.status === "error" && (
          <FormAlert tone="error" ref={alertRef}>
            {state.message}
          </FormAlert>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField id="signup-first-name" label="First name" error={errors?.firstName?.[0]}>
            {(control) => (
              <Input
                {...control}
                name="firstName"
                autoComplete="given-name"
                required
                value={values.firstName}
                onChange={update("firstName")}
              />
            )}
          </FormField>
          <FormField id="signup-last-name" label="Last name" error={errors?.lastName?.[0]}>
            {(control) => (
              <Input
                {...control}
                name="lastName"
                autoComplete="family-name"
                required
                value={values.lastName}
                onChange={update("lastName")}
              />
            )}
          </FormField>
        </div>

        <FormField id="signup-email" label="Email address" error={errors?.email?.[0]}>
          {(control) => (
            <Input
              {...control}
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              value={values.email}
              onChange={update("email")}
            />
          )}
        </FormField>

        <FormField
          id="signup-password"
          label="Password"
          hint={`Use ${PASSWORD_MIN_LENGTH} to ${PASSWORD_MAX_LENGTH} characters. Longer passphrases are great.`}
          error={errors?.password?.[0]}
        >
          {(control) => (
            <PasswordInput {...control} name="password" autoComplete="new-password" required />
          )}
        </FormField>

        {/* UI-only for now: the server doesn't record consent yet (see handoff doc). */}
        <div className="flex items-start gap-2">
          <input
            id="signup-terms"
            name="acceptTerms"
            type="checkbox"
            required
            className="mt-0.5 size-4 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          />
          <label htmlFor="signup-terms" className="text-nav text-foreground-secondary">
            I agree to the{" "}
            <Link href="#" className={linkStyles}>
              Terms &amp; Conditions
            </Link>{" "}
            and{" "}
            <Link href="#" className={linkStyles}>
              Privacy Policy
            </Link>
          </label>
        </div>

        <SubmitButton pending={pending} pendingLabel="Creating account…">
          Create account
        </SubmitButton>
      </form>

      <OrDivider label="or register with" />
      <GoogleButton />
    </>
  );
}

/** Success view: same page, no redirect, so it doesn't reveal anything new. */
function CheckYourEmail() {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);

  return (
    <div className="flex flex-col items-center gap-7 text-center">
      <span className="relative size-[65px] shrink-0">
        <Image
          src="/images/auth/email-open.svg"
          alt=""
          width={105}
          height={105}
          className="absolute max-w-none"
          style={{ inset: "-30.77%", width: "161.54%", height: "auto" }}
        />
      </span>
      <div className="flex flex-col gap-2">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl font-medium text-foreground-secondary focus:outline-none sm:text-4xl"
        >
          Check your email
        </h1>
        <p className="text-base leading-7 text-foreground-muted sm:text-lg">
          We&apos;ve sent a link to finish setting up your account. It expires in 24 hours.
        </p>
      </div>
      <ButtonLink href="/login" fullWidth>
        Back to log in
      </ButtonLink>
      <p className="text-nav text-foreground-muted">
        Didn&apos;t get it? Check your spam folder.
      </p>
    </div>
  );
}
