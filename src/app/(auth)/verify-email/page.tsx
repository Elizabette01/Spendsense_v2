import { resendVerification, verifyEmail } from "@/features/auth/actions/verify-email";

type Props = {
  searchParams: Promise<{ token?: string; status?: string }>;
};

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { token, status } = await searchParams;

  if (status === "verified") {
    return (
      <main>
        <h1>Email verified</h1>
        <p>Your email is confirmed. You can now <a href="/api/auth/signin">sign in</a>.</p>
      </main>
    );
  }

  if (status === "sent") {
    return (
      <main>
        <h1>Check your email</h1>
        <p>If that email has an account waiting to be verified, we&apos;ve sent a new link. It expires in 24 hours.</p>
      </main>
    );
  }

  if (status === "limited") {
    return (
      <main>
        <h1>Too many requests</h1>
        <p>Please wait a while before asking for another email.</p>
      </main>
    );
  }

  if (token && !status) {
    return (
      <main>
        <h1>Verify your email</h1>
        <form action={verifyEmail}>
          <input type="hidden" name="token" value={token} />
          <button type="submit">Confirm my email</button>
        </form>
      </main>
    );
  }

  return (
    <main>
      <h1>This link is invalid or has expired</h1>
      <p>Enter your email and we&apos;ll send a new verification link.</p>
      <form action={resendVerification}>
        <input type="email" name="email" required placeholder="Email" />
        <button type="submit">Send a new link</button>
      </form>
    </main>
  );
}