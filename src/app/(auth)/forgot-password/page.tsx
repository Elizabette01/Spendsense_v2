import { Suspense } from "react";
import { requestPasswordReset } from "@/features/auth/actions/password-reset";

type SearchParams = Promise<{ status?: string }>;

export default function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <main>
      <Suspense fallback={<p>Loading…</p>}>
        <ForgotPasswordContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function ForgotPasswordContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { status } = await searchParams;

  if (status === "sent") {
    return (
      <>
        <h1>Check your email</h1>
        <p>If that email has a SpendSense account, we&apos;ve sent a link to reset your password. It expires in 1 hour.</p>
      </>
    );
  }

  if (status === "limited") {
    return (
      <>
        <h1>Too many requests</h1>
        <p>Please wait a while before asking for another reset email.</p>
      </>
    );
  }

  return (
    <>
      <h1>Forgot your password?</h1>
      <p>Enter your email and we&apos;ll send you a link to choose a new one.</p>
      {status === "invalid-email" && <p role="alert">Enter a valid email address.</p>}
      <form action={requestPasswordReset}>
        <input type="email" name="email" required placeholder="Email" />
        <button type="submit">Send reset link</button>
      </form>
    </>
  );
}