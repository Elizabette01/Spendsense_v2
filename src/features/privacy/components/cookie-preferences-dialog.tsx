"use client";

import { useId, useState, type ReactNode } from "react";
import {
  clearAnalyticsCookies,
  createConsent,
  readConsentFromDocument,
  writeConsentToDocument,
} from "@/lib/consent";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Toggle } from "@/components/ui/toggle";

type CookiePreferencesDialogProps = {
  open: boolean;
  onClose: () => void;
  /** The saved choice when the dialog opened (false if none: off by default). */
  initialAnalytics: boolean;
};

/**
 * Cookie preferences (no Figma frame: built from the Edit Budget Modal and
 * the Settings notification rows).
 * Opened from the banner's "Manage preferences" and every "Cookie settings" button.
 */
export function CookiePreferencesDialog({
  open,
  onClose,
  initialAnalytics,
}: CookiePreferencesDialogProps) {
  const [analytics, setAnalytics] = useState(initialAnalytics);
  const necessaryId = useId();
  const analyticsId = useId();

  function save(allowAnalytics: boolean) {
    const wasAllowed = readConsentFromDocument()?.analytics === true;
    writeConsentToDocument(createConsent({ analytics: allowAnalytics }));

    // Withdrawal: scripts that already ran can't be unloaded, so remove their
    // cookies and reload the page so nothing keeps running.
    if (wasAllowed && !allowAnalytics) {
      clearAnalyticsCookies();
      window.location.reload();
      return;
    }
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Cookie settings"
      description="Choose which cookies SpendSense can use. You can change this at any time."
      footer={
        <>
          <Button variant="outline" onClick={() => save(analytics)} className="sm:mr-auto">
            Save preferences
          </Button>
          {/* Equal prominence: same variant and size, side by side */}
          <Button variant="secondary" onClick={() => save(false)}>
            Reject all
          </Button>
          <Button variant="secondary" onClick={() => save(true)}>
            Accept all
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <PreferenceRow
          id={necessaryId}
          title="Strictly necessary"
          text="These keep you signed in, protect our forms from attacks and remember your cookie choice. SpendSense can't work without them."
        >
          <div className="flex items-center gap-2">
            <span className="text-label text-foreground-muted">Always on</span>
            <Toggle
              checked
              disabled
              aria-labelledby={`${necessaryId}-title`}
              aria-describedby={`${necessaryId}-text`}
            />
          </div>
        </PreferenceRow>

        <PreferenceRow
          id={analyticsId}
          title="Analytics"
          text="Google Analytics, Vercel Web Analytics and Plausible help us understand how SpendSense is used, so we can improve it. We never send them your name, email or financial data."
        >
          <Toggle
            checked={analytics}
            onCheckedChange={setAnalytics}
            aria-labelledby={`${analyticsId}-title`}
            aria-describedby={`${analyticsId}-text`}
          />
        </PreferenceRow>
      </div>
    </Dialog>
  );
}

function PreferenceRow({
  id,
  title,
  text,
  children,
}: {
  id: string;
  title: string;
  text: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h3 id={`${id}-title`} className="text-body font-medium text-heading">
          {title}
        </h3>
        <p id={`${id}-text`} className="text-label text-foreground-muted">
          {text}
        </p>
      </div>
      <div className="pt-0.5">{children}</div>
    </div>
  );
}
