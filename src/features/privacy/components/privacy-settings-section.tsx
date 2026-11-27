import Link from "next/link";
import { SettingsRow, SettingsSection } from "@/components/ui/settings-section";
import { CookieSettingsButton } from "./cookie-settings-button";

/**
 * Settings "Privacy" card (no Figma frame: same row style as the Danger zone).
 * The signed-in area has no footer, so this is where its "Cookie settings" lives.
 */
export function PrivacySettingsSection() {
  return (
    <SettingsSection id="privacy-heading" title="Privacy">
      <SettingsRow
        title="Cookies"
        description={
          <>
            Choose whether we can use analytics.{" "}
            <Link
              href="/cookies"
              className="rounded-control font-medium text-primary underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Cookie policy
            </Link>
          </>
        }
        action={<CookieSettingsButton look="button" />}
      />
      <hr className="border-divider" />
      {/*
        TODO(Elizabette): before publishing, check Anthropic's current terms for
        API data retention and training, and add a plain-language line here if
        appropriate. No claims about them are made below on purpose.
      */}
      <SettingsRow
        title="AI categorisation"
        description={
          <div className="flex flex-col gap-2">
            <p>
              To suggest categories for merchants our own rules don&apos;t recognise, SpendSense
              uses Anthropic&apos;s API (the Claude AI model).
            </p>
            <p>
              <span className="font-medium text-foreground">What is sent:</span> cleaned merchant
              names (for example &ldquo;Tesco Stores&rdquo;) and whether money came in or went out.
            </p>
            <p>
              <span className="font-medium text-foreground">What is never sent:</span> amounts,
              dates, full transaction descriptions, account details, or your name or email.
            </p>
            <p>You can change any suggested category, and your choice is always kept.</p>
          </div>
        }
      />
    </SettingsSection>
  );
}
