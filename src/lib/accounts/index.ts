/**
 * CONTRACT (step 1): the accounts API. Team dashboard and onboarding code
 * import ONLY from "@/lib/accounts" (this file) and "@/lib/accounts/types".
 *
 * PLACEHOLDER: Worker A replaces these bodies (likely re-exporting from
 * ./service). Signatures and behaviour described here must hold.
 */
import type { Actor, AuditEntry, Role, SessionUser, SetupError, SignInError, User, UserStatus, Country } from "./types";

export * from "./types";

const todo = (): never => {
  throw new Error("accounts: not implemented yet");
};

/** Session cookie name. httpOnly, SameSite=Strict, Secure in production, 12h. */
export const SESSION_COOKIE = "ds_session";
export const SESSION_TTL_SECONDS = 12 * 60 * 60;

/** Email + password sign-in. On success returns a raw session token for the cookie. Records audit "auth.login". */
export async function signIn(
  _email: string,
  _password: string,
  _meta: { ip?: string },
): Promise<{ ok: true; token: string; user: User } | { ok: false; error: SignInError }> {
  return todo();
}

/** Revoke the session behind this raw token (no-op if unknown). */
export async function signOut(_token: string): Promise<void> {
  return todo();
}

/** Validate a raw session token: not expired, not revoked, user active. Returns null otherwise. */
export async function getSessionUser(_token: string | undefined): Promise<SessionUser | null> {
  return todo();
}

/** Revoke every session of a user (e.g. after suspend or password change). Audit "session.revoke_all". */
export async function revokeAllSessions(_userId: string, _actor: Actor | null): Promise<void> {
  return todo();
}

/**
 * Create a user with status "invited" and return a one-time setup link
 * (path + token, e.g. "/account/setup?token=…", valid 72h) the actor shares
 * by hand. Throws AccountError("forbidden" | "email_taken" | "invalid").
 * Rules: owner may create admin and lawyer (and owner); admin may create lawyer only.
 * Lawyers require a country. Audit "user.create".
 */
export async function createUser(
  _input: { email: string; name: string; role: Role; country?: Country | null },
  _actor: Actor,
): Promise<{ user: User; setupPath: string }> {
  return todo();
}

/** New one-time setup link for an existing user (password reset / re-invite). Invalidates older links. Audit "user.setup_link". */
export async function issueSetupLink(_userId: string, _actor: Actor): Promise<{ setupPath: string }> {
  return todo();
}

/** Consume a setup token, set the password (min 12 chars), mark active, start a session. Audit "user.setup_complete". */
export async function completeSetup(
  _token: string,
  _password: string,
): Promise<{ ok: true; token: string; user: User } | { ok: false; error: SetupError }> {
  return todo();
}

/** Change own password (checks current). Revokes other sessions. Audit "user.password_change". */
export async function changePassword(
  _userId: string,
  _current: string,
  _next: string,
): Promise<{ ok: true } | { ok: false; error: "invalid_current" | "weak_password" }> {
  return todo();
}

/**
 * Suspend or reactivate. Suspending revokes sessions. Never leaves zero active owners.
 * Throws AccountError("forbidden" | "last_owner" | "not_found"). Audit "user.suspend" / "user.reactivate".
 */
export async function setUserStatus(_userId: string, _status: Exclude<UserStatus, "invited">, _actor: Actor): Promise<User> {
  return todo();
}

export async function getUser(_id: string): Promise<User | null> {
  return todo();
}

export async function listUsers(_filter?: { role?: Role; status?: UserStatus }): Promise<User[]> {
  return todo();
}

/** Newest first. */
export async function listAudit(_opts?: { limit?: number; targetId?: string }): Promise<AuditEntry[]> {
  return todo();
}

export async function recordAudit(_entry: Omit<AuditEntry, "id" | "created_at" | "actor_email">): Promise<void> {
  return todo();
}

/** Can `actor` manage (suspend, reset, revoke) `target`? owner: anyone but self-suspend; admin: lawyers only. */
export function canManage(_actor: Actor, _target: Pick<User, "id" | "role">): boolean {
  return todo();
}

/** Which roles `actor` may create. owner: owner/admin/lawyer; admin: lawyer; lawyer: none. */
export function creatableRoles(_actor: Actor): Role[] {
  return todo();
}

/** True when the accounts database is reachable and migrated. */
export async function accountsAvailable(): Promise<boolean> {
  return todo();
}

export class AccountError extends Error {
  constructor(public code: "forbidden" | "email_taken" | "invalid" | "last_owner" | "not_found") {
    super(code);
  }
}
