"use client";

import { Button } from "@/components/ui/button";
import { openCookieSettings } from "../events";

const linkStyles =
  "rounded-control text-nav text-foreground-secondary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/**
 * "Cookie settings": opens the preferences dialog from anywhere.
 * A <button>, not a link, because it opens something instead of navigating.
 * - `look="link"` matches footer links
 * - `look="button"` is an outline button for pages (cookie policy, settings)
 */
export function CookieSettingsButton({ look = "link" }: { look?: "link" | "button" }) {
  if (look === "button") {
    return (
      <Button variant="outline" onClick={openCookieSettings}>
        Cookie settings
      </Button>
    );
  }
  return (
    <button type="button" onClick={openCookieSettings} className={linkStyles}>
      Cookie settings
    </button>
  );
}
