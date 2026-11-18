import type { Metadata } from "next";
import { Suspense } from "react";

import { OnboardingResultsPage } from "@/features/onboarding/components/gates";
import { OnboardingSkeleton } from "@/features/onboarding/components/onboarding-skeleton";

export const metadata: Metadata = { title: "Your first insights · SpendSense" };

export default function OnboardingResultsRoute() {
  return (
    <Suspense fallback={<OnboardingSkeleton />}>
      <OnboardingResultsPage />
    </Suspense>
  );
}
