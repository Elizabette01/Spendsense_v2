import type { Metadata } from "next";
import { Suspense } from "react";

import {
  RecurringOverview,
  RecurringOverviewSkeleton,
} from "@/features/recurring/components/recurring-overview";

export const metadata: Metadata = { title: "Recurring payments · SpendSense" };

export default function RecurringPage() {
  return (
    <div className="mx-auto flex max-w-269 flex-col gap-3">
      <div>
        <h1 className="text-page-title text-heading">Recurring payments</h1>
        <p className="text-body text-foreground-muted">
          Subscriptions and regular payments found in your statements
        </p>
      </div>
      <Suspense fallback={<RecurringOverviewSkeleton />}>
        <RecurringOverview />
      </Suspense>
    </div>
  );
}
