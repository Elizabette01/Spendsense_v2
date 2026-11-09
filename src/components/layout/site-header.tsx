import type { ReactNode } from "react";
import { Logo } from "./logo";
import { HeaderMenu } from "./header-menu";

type SiteHeaderProps = {
  /**
   * The buttons on the right (e.g. Log in / Get started).
   * Passed in by the route, so this shared layout piece doesn't depend on
   * any feature (the auth-aware buttons live in features/auth).
   */
  actions: ReactNode;
};

/** Top navbar shared by the landing page and the auth pages (Figma "Navbar"). */
export function SiteHeader({ actions }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-20 bg-card shadow-card">
      <div className="relative mx-auto flex h-14 max-w-[1150px] items-center justify-between px-4 sm:h-21 sm:px-6">
        <Logo />
        <HeaderMenu>{actions}</HeaderMenu>
      </div>
    </header>
  );
}
