import type { Metadata } from "next";
import { Suspense } from "react";
import { resendVerification, verifyEmail } from "@/features/auth/actions/verify-email";
import { ButtonLink } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { AuthCenteredCard } from "@/features/auth/components/auth-centered-card";
import { BackToLogin } from "@/features/auth/components/back-to-login";
import { FormSkeleton } from "@/features/auth/components/form-skeleton";
import { SubmitButton } from "@/features/auth/components/submit-button";

export const metadata: Metadata = { title: "Verify your email · SpendSense" };

type SearchParams = Promise<{ token?: string; status?: string }>;

/**
 * No Figma frames exist for these states; all are built from the
 * "Forgot password" centred-card layout so they match the family.
 */
export default function VerifyEmailPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense
      fallback={
        <AuthCenteredCard icon="email" title="Verify your email">
          <FormSkeleton fields={0} />
        </AuthCenteredCard>
      }
    >
      <VerifyEmailContent searchParams={searchParams} />
    </Suspense>
  );
}

async function VerifyEmailContent({ searchParams }: { searchParams: SearchParams }) {
  const { token, status } = await searchParams;

  if (status === "verified") {
    return (
      <AuthCenteredCard
        icon="tick"
        title="Email verified"
        description="Your email is confirmed. You can now log in."
      >
        <ButtonLink href="/login" fullWidth>
          Log in
        </ButtonLink>
      </AuthCenteredCard>
    );
  }

  if (status === "sent") {
    return (
      <AuthCenteredCard
        icon="email"
        title="Check your email"
        description="If that email has an account waiting to be verified, we've sent a new link. It expires in 24 hours."
      >
        <p className="text-center text-nav text-foreground-muted">
          Didn&apos;t get it? Check your spam folder.
        </p>
        <BackToLogin />
      </AuthCenteredCard>
    );
  }

  if (status === "limited") {
    return (
      <AuthCenteredCard
        icon="padlock"
        title="Too many requests"
        description="Please wait a while before asking for another email."
      >
        <BackToLogin />
      </AuthCenteredCard>
    );
  }

  // Opening the link changes nothing; only pressing the button verifies.
  if (token && !status) {
    return (
      <AuthCenteredCard
        icon="email"
        title="Verify your email"
        description="Confirm this is your email address to finish setting up your account."
      >
        <form action={verifyEmail}>
          <input type="hidden" name="token" value={token} />
          <SubmitButton pendingLabel="Confirming…">Confirm my email</SubmitButton>
        </form>
      </AuthCenteredCard>
    );
  }

  // Default: invalid, invalid-email, or no token at all.
  const emailError = status === "invalid-email" ? "Enter a valid email address." : undefined;

  return (
    <AuthCenteredCard
      icon="padlock"
      title="This link is invalid or has expired"
      description="Enter your email and we'll send a new verification link."
    >
      <form action={resendVerification} className="flex flex-col gap-6">
        <FormField id="verify-email" label="Email address" error={emailError}>
          {(control) => (
            <Input
              {...control}
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              // After a failed submit the page reloads; focus the field with the error
              autoFocus={Boolean(emailError)}
            />
          )}
        </FormField>
        <SubmitButton pendingLabel="Sending…">Send a new link</SubmitButton>
      </form>
      <BackToLogin />
    </AuthCenteredCard>
  );
}
