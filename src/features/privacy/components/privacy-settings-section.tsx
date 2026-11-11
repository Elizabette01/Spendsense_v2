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
    </SettingsSection>
  );
}
