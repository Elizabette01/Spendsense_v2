"use client";

import { useEffect, useState } from "react";
import { CONSENT_CHANGED_EVENT, readConsentFromDocument } from "@/lib/consent";
import { OPEN_COOKIE_SETTINGS_EVENT, openCookieSettings } from "../events";
import { CookieBanner } from "./cookie-banner";
import { CookiePreferencesDialog } from "./cookie-preferences-dialog";

/**
 * Owns the banner and the one preferences dialog for the whole site.
 * Rendered once in the root layout.
 *
 * Renders nothing on the server and on the first client render (so the
 * HTML always matches and the landing page stays static). After mount it
 * reads ss_consent in the browser and decides whether to show the banner.
 */
export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [dialog, setDialog] = useState({ open: false, key: 0, analytics: false });

  useEffect(() => {
    const check = () => setShowBanner(readConsentFromDocument() === null);
    const openDialog = () =>
      setDialog((current) => ({
        open: true,
        // A new key gives the dialog fresh state each time it opens
        key: current.key + 1,
        analytics: readConsentFromDocument()?.analytics === true,
      }));

    check();
    window.addEventListener(CONSENT_CHANGED_EVENT, check);
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, openDialog);
    return () => {
      window.removeEventListener(CONSENT_CHANGED_EVENT, check);
      window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, openDialog);
    };
  }, []);

  return (
    <>
      {showBanner && (
        <CookieBanner onManage={openCookieSettings} />
      )}
      {dialog.key > 0 && (
        <CookiePreferencesDialog
          key={dialog.key}
          open={dialog.open}
          initialAnalytics={dialog.analytics}
          onClose={() => setDialog((current) => ({ ...current, open: false }))}
        />
      )}
    </>
  );
}
