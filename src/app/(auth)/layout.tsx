import type { ReactNode } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { HeaderAuthActions } from "@/features/auth/components/header-auth-actions";

/** Shell for /login, /signup, /verify-email, /forgot-password, /reset-password. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader actions={<HeaderAuthActions />} />
      <main className="flex flex-1 justify-center bg-card px-6 sm:bg-background sm:px-6 sm:py-16 lg:py-28">
        {children}
      </main>
    </>
  );
}
