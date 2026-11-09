import type { ReactNode } from "react";
import { Logo } from "@/components/layout/logo";

type AuthSplitCardProps = {
  /** Big line on the green panel (desktop only). */
  panelTitle: string;
  /** Supporting line on the green panel. */
  panelText: string;
  children: ReactNode;
};

/**
 * Login and sign-up layout (Figma "Login-page" / "Signup-page"):
 * a green panel on the left and the form on the right.
 * Below the lg breakpoint the panel is hidden, matching the mobile frames.
 *
 * Contrast fix: the Figma gradient starts at brand-400, where white text is
 * only ~2.9:1. It starts at brand-600 here so the panel text passes WCAG AA.
 */
export function AuthSplitCard({ panelTitle, panelText, children }: AuthSplitCardProps) {
  return (
    <div className="flex w-full max-w-[1200px] overflow-hidden sm:rounded-[20px] sm:bg-card sm:shadow-card lg:min-h-[700px]">
      <aside className="hidden w-[480px] shrink-0 flex-col justify-between bg-linear-[22deg] from-brand-600 to-brand-800 p-8 text-white lg:flex">
        <Logo tone="inverse" asLink={false} />
        <div className="flex max-w-[362px] flex-col gap-10">
          <p className="text-4xl leading-tight">{panelTitle}</p>
          <p className="text-lg leading-7 text-white/90">{panelText}</p>
        </div>
        <p className="text-lg leading-7">
          {/* Fixed year: reading the clock would make this page dynamic */}
          © 2026 SpendSense. All rights reserved
        </p>
      </aside>

      <div className="flex flex-1 flex-col justify-center gap-6 py-6 sm:px-12 sm:py-12 lg:px-26">
        <div className="mx-auto flex w-full max-w-[512px] flex-col gap-6 sm:gap-7">
          {children}
        </div>
      </div>
    </div>
  );
}

/** Heading block used at the top of the form side ("Welcome back"). */
export function AuthHeading({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-2xl font-medium text-foreground-secondary sm:text-4xl">{title}</h1>
      {children && (
        <p className="text-base leading-7 text-foreground-muted sm:text-lg">{children}</p>
      )}
    </div>
  );
}
