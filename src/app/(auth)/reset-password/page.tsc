import { Suspense } from "react";
import Link from "next/link";
import { signIn } from "@/auth";
import { resetPassword } from "@/features/auth/actions/password-reset";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/lib/password-rules";

type SearchParams = Promise<{ token?: string; status?: string; error?: string }>;

const ERRORS: Record<string, string> = {
  length: `Use between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters.`,
  pwned: "This password has appeared in a data breach. Choose a different one.",
};

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <main>
      <Suspense fallback={<p>Loading…</p>}>
        <ResetPasswordContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function ResetPasswordContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { token, status, error } = await searchParams;

  if (status === "done") {
    return (
      <>
        <h1>Password updated</h1>
        <p>Your new password is set, and you&apos;ve been signed out on all devices.</p>
        <form
          action={async () => {
            "use server";
            await signIn(undefined, { redirectTo: "/" });
          }}
        >
          <button type="submit">Sign in</button>
        </form>
      </>
    );
  }

  if (status === "limited") {
    return (
      <>
        <h1>Too many attempts</h1>
        <p>Please wait a while, then open the link from your email again.</p>
      </>
    );
  }

  if (token && !status) {
    return (
      <>
        <h1>Choose a new password</h1>
        {error && ERRORS[error] && <p role="alert">{ERRORS[error]}</p>}
        <form action={resetPassword}>
          <input type="hidden" name="token" value={token} />
          <input
            type="password"
            name="password"
            required
            autoComplete="new-password"
            placeholder="New password"
          />
          <button type="submit">Set new password</button>
        </form>
      </>
    );
  }

  return (
    <>
      <h1>This link is invalid or has expired</h1>
      <p>
        Reset links work once and expire after 1 hour.{" "}
        <Link href="/forgot-password">Request a new link</Link>.
      </p>
    </>
  );
}