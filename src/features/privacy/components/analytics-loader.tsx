"use client";

import { GoogleAnalytics } from "@next/third-parties/google";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";
import { useEffect, useState } from "react";
import { CONSENT_CHANGED_EVENT, hasConsent, readConsentFromDocument } from "@/lib/consent";

// NEXT_PUBLIC_ values are baked into the browser bundle at build time.
const VERCEL_ANALYTICS = process.env.NEXT_PUBLIC_VERCEL_ANALYTICS === "true";
const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const PLAUSIBLE_DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

/**
 * Loads analytics only after the visitor has allowed it. Rendered once in
 * the root layout.
 *
 * - Renders nothing on the server and on the first client render; reads the
 *   consent cookie after mount (no hydration mismatch, landing stays static).
 * - Listens for consent changes, so "Accept all" starts analytics without a
 *   reload. Withdrawing reloads the page (see the preferences dialog), which
 *   is what actually stops scripts that have already run.
 * - Each tool loads only if its env variable is set.
 * - No user IDs, names, emails or custom events are ever sent.
 */
export function AnalyticsLoader() {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const check = () => setAllowed(hasConsent(readConsentFromDocument(), "analytics"));
    check();
    window.addEventListener(CONSENT_CHANGED_EVENT, check);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, check);
  }, []);

  if (!allowed) return null;

  return (
    <>
      {VERCEL_ANALYTICS && <Analytics />}
      {GA_ID && <GoogleAnalytics gaId={GA_ID} />}
      {PLAUSIBLE_DOMAIN && (
        <Script
          src="https://plausible.io/js/script.js"
          data-domain={PLAUSIBLE_DOMAIN}
          strategy="afterInteractive"
        />
      )}
    </>
  );
}
