/**
 * "Open the cookie preferences dialog", from anywhere on the page.
 *
 * Any "Cookie settings" button calls openCookieSettings(); the one
 * <CookieConsent /> in the root layout listens for the event and opens the
 * dialog. A browser event (rather than React context) means the buttons can
 * sit in server-rendered footers and pages without a provider around them.
 */
export const OPEN_COOKIE_SETTINGS_EVENT = "ss:open-cookie-settings";

export function openCookieSettings(): void {
  window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT));
}
