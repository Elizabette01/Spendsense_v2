import { Suspense, type ReactNode } from "react";

import { SiteHeader } from "@/components/layout/site-header";
import { signOutAction } from "@/features/auth/actions/sign-out";
import { RequireSession } from "@/features/auth/components/require-session";
import { SubmitButton } from "@/features/auth/components/submit-button";
import { StaleSessionGuard } from "@/features/auth/stale-session-guard";

/**
 * Onboarding sits outside the app shell (no sidebar). The user is signed in,
 * so the header shows the logo and Sign out, not "Log in" / "Get started".
 */
export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <RequireSession />
      <SiteHeader
        actions={
          <form action={signOutAction}>
            <div className="w-full sm:w-auto">
              <SubmitButton pendingLabel="Signing out…">Sign out</SubmitButton>
            </div>
          </form>
        }
      />
      <main className="min-h-[calc(100dvh-3.5rem)] bg-background px-4 py-10 sm:min-h-[calc(100dvh-5.25rem)] sm:py-25">
        {children}
      </main>
      <Suspense fallback={null}>
        <StaleSessionGuard />
      </Suspense>
    </>
  );
}
