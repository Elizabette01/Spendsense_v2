import type { Metadata } from "next";
import { Suspense } from "react";
import { requestPasswordReset } from "@/features/auth/actions/password-reset";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { AuthCenteredCard } from "@/features/auth/components/auth-centered-card";
import { BackToLogin } from "@/features/auth/components/back-to-login";
import { FormSkeleton } from "@/features/auth/components/form-skeleton";
import { SubmitButton } from "@/features/auth/components/submit-button";

export const metadata: Metadata = { title: "Reset your password · SpendSense" };

type SearchParams = Promise<{ status?: string }>;

export default function ForgotPasswordPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense
      fallback={
        <AuthCenteredCard icon="padlock" title="Reset password">
          <FormSkeleton fields={1} />
        </AuthCenteredCard>
      }
    >
      <ForgotPasswordContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ForgotPasswordContent({ searchParams }: { searchParams: SearchParams }) {
  const { status } = await searchParams;

  // Figma "Forgot password - 2". Wording never confirms the account exists.
  if (status === "sent") {
    return (
      <AuthCenteredCard
        icon="email"
        title="Check your email"
        description="If that email has a SpendSense account, we've sent a link to reset your password. It expires in 1 hour."
      >
        <p className="text-center text-nav text-foreground-muted">
          Didn&apos;t get it? Check your spam folder.
        </p>
        <BackToLogin />
      </AuthCenteredCard>
    );
  }

  // No Figma frame: built from the "Forgot password - 1" layout.
  if (status === "limited") {
    return (
      <AuthCenteredCard
        icon="padlock"
        title="Too many requests"
        description="Please wait a while before asking for another reset email."
      >
        <BackToLogin />
      </AuthCenteredCard>
    );
  }

  // Figma "Forgot password - 1"
  const emailError = status === "invalid-email" ? "Enter a valid email address." : undefined;

  return (
    <AuthCenteredCard
      icon="padlock"
      title="Reset password"
      description="Enter your email and we'll send you a link to reset your password."
    >
      <hr className="border-t border-dashed border-foreground-subtle" />
      <form action={requestPasswordReset} className="flex flex-col gap-6">
        <FormField id="forgot-email" label="Email address" error={emailError}>
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
        <SubmitButton pendingLabel="Sending…">Send reset link</SubmitButton>
      </form>
      <BackToLogin />
    </AuthCenteredCard>
  );
}
