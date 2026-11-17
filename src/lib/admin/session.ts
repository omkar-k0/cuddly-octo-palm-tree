import "server-only";
/**
 * Dashboard session helpers, kept for existing callers. Sessions are database
 * sessions now (src/lib/accounts); any signed-in role may use /admin.
 */
import { getCurrentUser, requireUser, userFromRequest } from "@/lib/accounts/session";
import type { SessionUser } from "@/lib/accounts/types";

export type Session = SessionUser;

/** Current user, or null. Reads the request: call inside <Suspense>. */
export async function getSession(): Promise<Session | null> {
  return getCurrentUser();
}

/** For admin pages: the user, or a redirect to the login page. */
export async function requireSession(): Promise<Session> {
  return requireUser();
}

/** For admin API routes: the user from the request, or null. */
export async function sessionFromRequest(request: Request): Promise<Session | null> {
  return userFromRequest(request);
}
