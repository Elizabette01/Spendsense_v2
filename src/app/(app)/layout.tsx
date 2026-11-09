import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ActivityTracker } from "@/features/auth/activity-tracker";
import { SidebarUser } from "@/features/auth/components/sidebar-user";
import { SignOutButton } from "@/features/auth/components/sign-out-button";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AppShell user={<SidebarUser />} signOut={<SignOutButton />}>
        {children}
      </AppShell>
      <Suspense fallback={null}>
        <ActivityTracker />
      </Suspense>
    </>
  );
}
