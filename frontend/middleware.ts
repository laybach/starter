import { NextRequest, NextResponse } from "next/server";

// Cookies are scoped by hostname, not port, so the session cookie the API (:9100) sets is visible
// here (:9000). This only checks presence; the API verifies it on every request and apiFetch
// bounces to /login if it turns out stale.
const COOKIE_NAME = "starter_session";

export function middleware(request: NextRequest) {
  if (!request.cookies.has(COOKIE_NAME)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // The manifest and icons are fetched without credentials by the browser and OS.
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest).*)"],
};
