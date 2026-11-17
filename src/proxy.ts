import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic gate for the dashboards and account pages: a well-formed
 * session cookie must be present. It does not touch the database; every page
 * and API checks the session and role itself. This is the first line, not
 * the only one.
 */
const SESSION_COOKIE = "ds_session"; // same as SESSION_COOKIE in @/lib/accounts
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
const OPEN = new Set(["/admin/login", "/api/admin/login", "/account/setup", "/api/account/setup"]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (OPEN.has(path) || (token && TOKEN_RE.test(token))) {
    const res = NextResponse.next();
    res.headers.set("Cache-Control", "no-store");
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }
  if (path.startsWith("/api/")) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.redirect(new URL("/admin/login", request.url));
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/team/:path*",
    "/account/:path*",
    "/api/admin/:path*",
    "/api/team/:path*",
    "/api/account/:path*",
  ],
};
