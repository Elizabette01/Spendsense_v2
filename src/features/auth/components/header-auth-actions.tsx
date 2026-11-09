import { connection } from "next/server";
import { Suspense } from "react";
import { auth } from "@/auth";
import { ButtonLink } from "@/components/ui/button";
import { signOutAction } from "../actions/sign-out";
import { SubmitButton } from "./submit-button";

/**
 * Navbar buttons that depend on who's signed in.
 * auth() reads the request cookie, so it must sit inside <Suspense>:
 * the rest of the page is prerendered and this part streams in per request.
 */
export function HeaderAuthActions() {
  return (
    <Suspense fallback={<SignedOutActions />}>
      <AuthAwareActions />
    </Suspense>
  );
}

async function AuthAwareActions() {
  // Mark this as request-time first: auth() uses crypto before it reads the
  // cookie, which Next otherwise flags while prerendering the static shell.
  await connection();
  const session = await auth();
  if (!session?.user) return <SignedOutActions />;

  return (
    <>
      <ButtonLink href="/dashboard" variant="ghost">
        Dashboard
      </ButtonLink>
      <form action={signOutAction}>
        <div className="w-full sm:w-auto">
          <SubmitButton pendingLabel="Signing out…">Sign out</SubmitButton>
        </div>
      </form>
    </>
  );
}

/**
 * Also the loading fallback: most visitors are signed out, so showing these
 * first avoids an empty gap. Signed-in visitors see them swap in a moment later,
 * and clicking Log in while signed in just lands on /dashboard (the proxy).
 */
function SignedOutActions() {
  return (
    <>
      <ButtonLink href="/login" variant="ghost">
        Log in
      </ButtonLink>
      <ButtonLink href="/signup">Get started</ButtonLink>
    </>
  );
}
