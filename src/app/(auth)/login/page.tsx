import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FormAlert } from "@/components/ui/form-alert";
import { AuthHeading, AuthSplitCard } from "@/features/auth/components/auth-split-card";
import { FormSkeleton } from "@/features/auth/components/form-skeleton";
import { GoogleButton, OrDivider } from "@/features/auth/components/google-button";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Log in · SpendSense" };

type SearchParams = Promise<{ callbackUrl?: string | string[]; error?: string; status?: string }>;

/** Banners we know how to show. Raw URL text is never printed. */
const ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked:
    "This email already has a SpendSense password. Sign in with your email and password instead.",
  AccessDenied: "We couldn't sign you in with Google. Please try another method.",
};
const FALLBACK_ERROR = "Something went wrong signing in. Please try again.";

export default function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <AuthSplitCard
      panelTitle="Smart insights for smarter spending"
      panelText="Take control of your cashflow with AI-powered categorisation, recurring payment tracking, and personalised budgeting insights."
    >
      <AuthHeading title="Welcome back">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="rounded-control font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Sign up
        </Link>
      </AuthHeading>

      <Suspense fallback={<FormSkeleton />}>
        <LoginContent searchParams={searchParams} />
      </Suspense>
    </AuthSplitCard>
  );
}

async function LoginContent({ searchParams }: { searchParams: SearchParams }) {
  const { callbackUrl: rawCallbackUrl, error, status } = await searchParams;
  // Only a single string is passed on; the server action validates it.
  const callbackUrl = typeof rawCallbackUrl === "string" ? rawCallbackUrl : undefined;

  return (
    <>
      {status === "password-changed" && (
        <FormAlert tone="success">
          Your password was changed. Sign in with your new password.
        </FormAlert>
      )}
      {error && <FormAlert tone="error">{ERROR_MESSAGES[error] ?? FALLBACK_ERROR}</FormAlert>}

      <LoginForm callbackUrl={callbackUrl} />
      <OrDivider label="or continue with" />
      <GoogleButton callbackUrl={callbackUrl} />
    </>
  );
}
