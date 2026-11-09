import type { ReactNode } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { HeaderAuthActions } from "@/features/auth/components/header-auth-actions";
import { SiteFooter } from "@/features/marketing/components/site-footer";

/** Landing page shell: navbar, page content, footer. */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader actions={<HeaderAuthActions />} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
