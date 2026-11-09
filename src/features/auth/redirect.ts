const DEFAULT_REDIRECT = "/dashboard";
const PLACEHOLDER_ORIGIN = "http://placeholder.local";
const AUTH_PAGES = ["/login", "/signup"];

export function safeCallbackUrl(value: FormDataEntryValue | null): string {
  // 1. Must be a non-empty string that starts with a single "/"
  if (typeof value !== "string" || !value.startsWith("/") || value.length > 2048) {
    return DEFAULT_REDIRECT;
  }

  // 2. Let the URL parser decide where it really points
  let url: URL;
  try {
    url = new URL(value, PLACEHOLDER_ORIGIN);
  } catch {
    return DEFAULT_REDIRECT;
  }
  if (url.origin !== PLACEHOLDER_ORIGIN) return DEFAULT_REDIRECT;

  // 3. Don't send someone back to the login or signup page
  if (AUTH_PAGES.some((page) => url.pathname === page || url.pathname.startsWith(`${page}/`))) {
    return DEFAULT_REDIRECT;
  }

  return `${url.pathname}${url.search}${url.hash}`;
}