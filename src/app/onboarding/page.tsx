import type { Metadata } from "next";
import { Suspense } from "react";

import { importStatement } from "@/features/imports/actions/import-statement";
import { previewStatement } from "@/features/imports/actions/preview-statement";
import { OnboardingOnlyIfNeeded } from "@/features/onboarding/components/gates";
import { OnboardingFlow } from "@/features/onboarding/components/onboarding-flow";
import { OnboardingSkeleton } from "@/features/onboarding/components/onboarding-skeleton";

export const metadata: Metadata = { title: "Welcome · SpendSense" };

export default function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingSkeleton />}>
      <OnboardingOnlyIfNeeded>
        {/* The route passes the imports actions in: features never import each other */}
        <OnboardingFlow previewAction={previewStatement} importAction={importStatement} />
      </OnboardingOnlyIfNeeded>
    </Suspense>
  );
}
