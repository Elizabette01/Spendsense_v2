import type { Metadata } from "next";
import { Suspense } from "react";
import {
  reactivateAccount,
  resendReactivation,
} from "@/features/auth/actions/reactivate-account";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { AuthCenteredCard } from "@/features/auth/components/auth-centered-card";
import { BackToLogin } from "@/features/auth/components/back-to-login";
import { FormSkeleton } from "@/features/auth/components/form-skeleton";
import { SubmitButton } from "@/features/auth/components/submit-button";

export const metadata: Metadata = { title: "Reactivate your account · SpendSense" };

type SearchParams = Promise<{ token?: string; status?: string }>;

/**
 * No Figma frame: built from the "Forgot password" centred card, like
 * /verify-email. Behaviour is unchanged from the original minimal page.
 */
export default function ReactivateAccountPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <Suspense
      fallback={
        <AuthCenteredCard icon="padlock" title="Reactivate your account">
          <FormSkeleton fields={0} />
        </AuthCenteredCard>
      }
    >
      <ReactivateContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ReactivateContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { token, status } = await searchParams;

  if (status === "sent") {
    return (
      <AuthCenteredCard
        icon="email"
        title="Check your email"
        description="If that email belongs to an account scheduled for deletion, we've sent a new reactivation link. It works until the scheduled deletion time."
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
        description="Please wait a while before asking for another link."
      >
        <BackToLogin />
      </AuthCenteredCard>
    );
  }

  // Opening the link changes nothing (safe from email link scanners);
  // only pressing the button reactivates.
  if (token && !status) {
    return (
      <AuthCenteredCard
        icon="tick"
        title="Reactivate your account"
        description="Your account is scheduled for deletion. Confirm below to keep it."
      >
        <form action={reactivateAccount}>
          <input type="hidden" name="token" value={token} />
          <SubmitButton pendingLabel="Reactivating…">Keep my account</SubmitButton>
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
      description="If your account is still scheduled for deletion, enter your email and we'll send a new reactivation link."
    >
      <form action={resendReactivation} className="flex flex-col gap-6">
        <FormField id="reactivate-email" label="Email address" error={emailError}>
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
