import type { Metadata } from "next";
import { Suspense } from "react";
import { resetPassword } from "@/features/auth/actions/password-reset";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/password-rules";
import { ButtonLink } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { AuthCenteredCard } from "@/features/auth/components/auth-centered-card";
import { BackToLogin } from "@/features/auth/components/back-to-login";
import { FormSkeleton } from "@/features/auth/components/form-skeleton";
import { PasswordInput } from "@/features/auth/components/password-input";
import { SubmitButton } from "@/features/auth/components/submit-button";

export const metadata: Metadata = { title: "Choose a new password · SpendSense" };

type SearchParams = Promise<{ token?: string; status?: string; error?: string }>;

/** Known error codes only; raw URL text is never shown. */
const ERRORS: Record<string, string> = {
  length: `Use between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters.`,
  pwned: "This password has appeared in a data breach. Choose a different one.",
};

export default function ResetPasswordPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense
      fallback={
        <AuthCenteredCard icon="padlock" title="Choose a new password">
          <FormSkeleton fields={1} />
        </AuthCenteredCard>
      }
    >
      <ResetPasswordContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ResetPasswordContent({ searchParams }: { searchParams: SearchParams }) {
  const { token, status, error } = await searchParams;

  // Figma "Forgot password - 4"
  if (status === "done") {
    return (
      <AuthCenteredCard
        icon="tick"
        title="Password changed"
        description="Your new password is set, and you've been signed out on all devices."
      >
        <ButtonLink href="/login" fullWidth>
          Log in now
        </ButtonLink>
      </AuthCenteredCard>
    );
  }

  // No Figma frame: built from the "Forgot password - 1" layout.
  if (status === "limited") {
    return (
      <AuthCenteredCard
        icon="padlock"
        title="Too many attempts"
        description="Please wait a while, then open the link from your email again."
      >
        <BackToLogin />
      </AuthCenteredCard>
    );
  }

  // Figma "Forgot password - 3" (single password box; see hand-back notes)
  if (token && !status) {
    const passwordError = error ? ERRORS[error] : undefined;

    return (
      <AuthCenteredCard
        icon="padlock"
        title="Choose a new password"
        description="Enter a new password for your SpendSense account."
      >
        <form action={resetPassword} className="flex flex-col gap-6">
          <input type="hidden" name="token" value={token} />
          <FormField
            id="reset-password"
            label="New password"
            hint={`Use ${PASSWORD_MIN_LENGTH} to ${PASSWORD_MAX_LENGTH} characters. Longer passphrases are great.`}
            error={passwordError}
          >
            {(control) => (
              <PasswordInput
                {...control}
                name="password"
                autoComplete="new-password"
                required
                // After a failed submit the page reloads; focus the field with the error
                autoFocus={Boolean(passwordError)}
              />
            )}
          </FormField>
          <SubmitButton pendingLabel="Saving…">Set new password</SubmitButton>
        </form>
      </AuthCenteredCard>
    );
  }

  // No Figma frame: invalid or expired link.
  return (
    <AuthCenteredCard
      icon="padlock"
      title="This link is invalid or has expired"
      description="Reset links work once and expire after 1 hour."
    >
      <ButtonLink href="/forgot-password" fullWidth>
        Request a new link
      </ButtonLink>
      <BackToLogin />
    </AuthCenteredCard>
  );
}
