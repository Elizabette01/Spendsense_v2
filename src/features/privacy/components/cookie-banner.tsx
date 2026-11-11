"use client";

import Link from "next/link";
import { createConsent, writeConsentToDocument } from "@/lib/consent";
import { Button } from "@/components/ui/button";

/**
 * Cookie banner (no Figma frame: a card in the shared card style, pinned to
 * the bottom of the screen). Shown by <CookieConsent /> only when there's no
 * valid saved choice.
 *
 * - A region, not a modal: the page stays usable behind it.
 * - Doesn't move focus on load; it's early in the tab order instead.
 * - Accept all and Reject all use the same variant and size, side by side.
 */
export function CookieBanner({ onManage }: { onManage: () => void }) {
  return (
    <section
      role="region"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6"
    >
      <div className="mx-auto flex max-w-300 flex-col gap-4 rounded-card border border-border bg-card p-5 shadow-card lg:flex-row lg:items-center lg:justify-between lg:gap-8">
        <p className="text-nav text-foreground">
          We use essential cookies to keep you signed in and secure. With your permission,
          we&apos;d also like to use analytics to understand how SpendSense is used and improve
          it.{" "}
          <Link
            href="/cookies"
            className="rounded-control font-medium text-primary underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Cookie policy
          </Link>
        </p>

        <div className="flex shrink-0 flex-col gap-3 sm:flex-row-reverse sm:justify-end lg:flex-row">
          <Button variant="ghost" onClick={onManage}>
            Manage preferences
          </Button>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="secondary"
              onClick={() => writeConsentToDocument(createConsent({ analytics: false }))}
            >
              Reject all
            </Button>
            <Button
              variant="secondary"
              onClick={() => writeConsentToDocument(createConsent({ analytics: true }))}
            >
              Accept all
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
