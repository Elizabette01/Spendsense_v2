import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { ReactNode } from "react";

import { getOnboardingState, getOnboardingSummary, hasFinishedOnboarding } from "../queries";
import { OnboardingResults } from "./results";

/*
 * Server components that read the session, so each must sit inside <Suspense>.
 * `connection()` first marks them request-time: they can never be prerendered.
 */

/** /dashboard: a first-time user ("needed") goes to /onboarding. Renders nothing. */
export async function SendToOnboardingIfNeeded() {
  await connection();
  if ((await getOnboardingState()) === "needed") redirect("/onboarding");
  return null;
}

/** /onboarding: anyone already "done" goes to /dashboard; everyone else sees `children`. */
export async function OnboardingOnlyIfNeeded({ children }: { children: ReactNode }) {
  await connection();
  if ((await getOnboardingState()) === "done") redirect("/dashboard");
  return children;
}

/**
 * /onboarding/results. Finished (completed or skipped) → /dashboard.
 * No transactions yet → back to /onboarding to upload. Otherwise the summary.
 * (Uses "finished" rather than "done": straight after the import the user
 * already has a statement, which would count as "done".)
 */
export async function OnboardingResultsPage() {
  await connection();
  if (await hasFinishedOnboarding()) redirect("/dashboard");
  const summary = await getOnboardingSummary();
  if (!summary) redirect("/onboarding");
  return <OnboardingResults summary={summary} />;
}
