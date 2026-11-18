import type { Metadata } from "next";
import { Suspense } from "react";

import { DashboardBody, DashboardHeader } from "@/features/dashboard/components/dashboard-body";
import { DashboardSkeleton } from "@/features/dashboard/components/dashboard-extras";

export const metadata: Metadata = { title: "Dashboard · SpendSense" };

export default function DashboardPage() {
  return (
    <div className="mx-auto flex max-w-269 flex-col gap-6">
      <Suspense
        fallback={
          <div aria-hidden="true" className="flex flex-col gap-2">
            <div className="h-8 w-72 rounded-control bg-card" />
            <div className="h-4 w-56 rounded-control bg-card" />
          </div>
        }
      >
        <DashboardHeader />
      </Suspense>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardBody />
      </Suspense>
    </div>
  );
}
