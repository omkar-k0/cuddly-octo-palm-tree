import "server-only";
/**
 * CONTRACT (step 1): request-level helpers for pages and route handlers.
 * PLACEHOLDER: Worker A replaces these bodies. Signatures must not change.
 *
 * Pages read cookies, so call these inside a <Suspense> boundary
 * (Cache Components). Route handlers use userFromRequest.
 */
import type { Role, SessionUser } from "./types";

/** Signed-in user, or null. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  return null;
}

/** For pages: the user, or redirect to /admin/login. If `roles` given and the user's role is not in it, redirect to /admin (or render notFound for lawyers hitting /team). */
export async function requireUser(_roles?: Role[]): Promise<SessionUser> {
  throw new Error("accounts: not implemented yet");
}

/** For route handlers: user from the request's cookie header, or null. Optionally require a role. */
export async function userFromRequest(_request: Request, _roles?: Role[]): Promise<SessionUser | null> {
  return null;
}
