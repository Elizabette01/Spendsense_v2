import { Suspense, type ReactNode } from "react";
import { ActivityTracker } from "@/features/auth/activity-tracker";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Suspense fallback={null}>
        <ActivityTracker />
      </Suspense>
    </>
  );
}