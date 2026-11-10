import { NextResponse, type NextRequest } from "next/server";

const DESTINATIONS: Record<string, string> = {
  "deletion-scheduled": "/login?status=deletion-scheduled",
  expired: "/login",
};

export function GET(request: NextRequest) {
  const reason = request.nextUrl.searchParams.get("reason") ?? "";
  const destination = DESTINATIONS[reason] ?? "/login";

  const response = NextResponse.redirect(
    new URL(destination, request.nextUrl.origin),
  );

  // 1. Modern browsers: wipe every cookie for this site
  response.headers.set("Clear-Site-Data", '"cookies"');

  // 2. Fallback: expire the Auth.js session cookie(s) by name
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.includes("authjs.session-token")) {
      response.cookies.set(cookie.name, "", {
        path: "/",
        maxAge: 0,
        secure: cookie.name.startsWith("__Secure-"),
      });
    }
  }

  return response;
}