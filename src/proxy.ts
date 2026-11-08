import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

// Adjust these to match your folders (real URLs, never "(app)")
const PROTECTED_PREFIXES = ["/dashboard", "/onboarding", "/settings"];
const ADMIN_PREFIXES = ["/admin"];
const SIGNED_OUT_ONLY = ["/login", "/signup"];

function matches(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export const proxy = auth((req) => {
  const { pathname, search } = req.nextUrl;
  const user = req.auth?.user;

  // 1. Admin area: pretend it doesn't exist unless you're an admin
  if (matches(pathname, ADMIN_PREFIXES)) {
    if (user?.role !== "ADMIN") {
      return new NextResponse("Not Found", { status: 404 });
    }
    return NextResponse.next();
  }

  // 2. App pages: send signed-out visitors to log in, then back here
  if (matches(pathname, PROTECTED_PREFIXES) && !user) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Login and signup: signed-in users don't need these
  if (matches(pathname, SIGNED_OUT_ONLY) && user) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)",
  ],
};