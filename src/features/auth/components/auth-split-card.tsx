import Link from "next/link";
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
    <div className="flex w-full max-w-[1200px] overflow-hidden sm:rounded-[1.25rem] sm:bg-card sm:shadow-card lg:min-h-175">
      <aside className="hidden w-120 shrink-0 flex-col justify-between bg-linear-[22deg] from-brand-600 to-brand-800 p-8 text-white lg:flex">
        <div className="flex items-center justify-between gap-4">
          <Logo tone="inverse" asLink={false} />
          <BackToHomepage tone="inverse" />
        </div>
        <div className="flex max-w-90.5 flex-col gap-10">
          <p className="text-4xl leading-tight">{panelTitle}</p>
          <p className="text-lg leading-7 text-white/90">{panelText}</p>
        </div>
        <p className="text-lg leading-7">
          {/* Fixed year: reading the clock would make this page dynamic */}
          © 2026 SpendSense. All rights reserved
        </p>
      </aside>

      {/* Top-aligned on phones (Figma mobile frames), centred in the card from sm up */}
      <div className="flex flex-1 flex-col justify-start gap-6 py-6 sm:justify-center sm:px-12 sm:py-12 lg:px-26">
        <div className="mx-auto flex w-full max-w-128 flex-col gap-6 sm:gap-7">
          {/* The green panel (with its own back link) is hidden below lg */}
          <div className="lg:hidden">
            <BackToHomepage tone="brand" />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

/** "← Back to homepage" link: white on the green panel, green on the card. */
function BackToHomepage({ tone }: { tone: "brand" | "inverse" }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-1.5 rounded-control text-nav font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 ${
        tone === "inverse"
          ? "text-white focus-visible:outline-white"
          : "text-primary focus-visible:outline-primary"
      }`}
    >
      <span aria-hidden="true" className="text-base">
        ←
      </span>
      Back to homepage
    </Link>
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
