import { Suspense } from "react";
import {
  reactivateAccount,
  resendReactivation,
} from "@/features/auth/actions/reactivate-account";

type SearchParams = Promise<{ token?: string; status?: string }>;

export default function ReactivateAccountPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <main>
      <Suspense fallback={<p>Loading…</p>}>
        <ReactivateContent searchParams={searchParams} />
      </Suspense>
    </main>
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
      <>
        <h1>Check your email</h1>
        <p>If that email belongs to an account scheduled for deletion, we&apos;ve sent a new reactivation link. It works until the scheduled deletion time.</p>
      </>
    );
  }

  if (status === "limited") {
    return (
      <>
        <h1>Too many requests</h1>
        <p>Please wait a while before asking for another link.</p>
      </>
    );
  }

  if (token && !status) {
    return (
      <>
        <h1>Reactivate your account</h1>
        <p>Your account is scheduled for deletion. Confirm below to keep it.</p>
        <form action={reactivateAccount}>
          <input type="hidden" name="token" value={token} />
          <button type="submit">Keep my account</button>
        </form>
      </>
    );
  }

  return (
    <>
      <h1>This link is invalid or has expired</h1>
      <p>If your account is still scheduled for deletion, enter your email and we&apos;ll send a new reactivation link.</p>
      {status === "invalid-email" && <p role="alert">Enter a valid email address.</p>}
      <form action={resendReactivation}>
        <input type="email" name="email" required placeholder="Email" />
        <button type="submit">Send a new link</button>
      </form>
    </>
  );
}