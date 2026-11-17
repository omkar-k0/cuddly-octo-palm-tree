import "server-only";
/**
 * CONTRACT (step 1): request-level helpers for pages and route handlers.
 *
 * Pages read cookies, so call these inside a <Suspense> boundary
 * (Cache Components). Route handlers use userFromRequest.
 */
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { getSessionUser, SESSION_COOKIE } from "./service";
import type { Role, SessionUser } from "./types";

async function lookup(token: string | undefined): Promise<SessionUser | null> {
  try {
    return await getSessionUser(token);
  } catch (e) {
    console.error(`[accounts] session lookup failed: ${(e as Error).name}`);
    return null;
  }
}

/** Value of the session cookie in a raw Cookie header. */
export function sessionTokenFromCookieHeader(header: string | null): string | undefined {
  for (const part of (header ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === SESSION_COOKIE) {
      try {
        return decodeURIComponent(part.slice(i + 1).trim());
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

/** Signed-in user, or null. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  // Session checks are per request: never part of a (runtime) prerender, where
  // the database driver's clock and randomness are not allowed.
  await connection();
  return lookup(token);
}

/** For pages: the user, or redirect to /admin/login. If `roles` is given and the user's role is not in it: notFound(). */
export async function requireUser(roles?: Role[]): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (roles && !roles.includes(user.role)) notFound();
  return user;
}

/** For route handlers: user from the request's cookie header, or null. Optionally require a role. */
export async function userFromRequest(request: Request, roles?: Role[]): Promise<SessionUser | null> {
  const user = await lookup(sessionTokenFromCookieHeader(request.headers.get("cookie")));
  if (!user || (roles && !roles.includes(user.role))) return null;
  return user;
}
