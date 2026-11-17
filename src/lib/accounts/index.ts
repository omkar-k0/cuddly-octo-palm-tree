/**
 * CONTRACT (step 1): the accounts API. Team dashboard and onboarding code
 * import ONLY from "@/lib/accounts" (this file) and "@/lib/accounts/types".
 *
 * Implemented in ./service. Behaviour of each export:
 *
 * - SESSION_COOKIE / SESSION_TTL_SECONDS: cookie "ds_session"; httpOnly,
 *   SameSite=Strict, Secure in production, 12h.
 * - signIn(email, password, { ip }): on success returns a raw session token
 *   for the cookie. Records audit "auth.login". Errors: invalid | suspended |
 *   throttled | unavailable.
 * - signOut(token): revoke the session behind this raw token (no-op if unknown).
 * - getSessionUser(token): not expired, not revoked, user active; else null.
 * - revokeAllSessions(userId, actor): revoke every session of a user (e.g.
 *   after suspend or password change). Audit "session.revoke_all".
 * - createUser(input, actor): status "invited" plus a one-time setup link
 *   ("/account/setup?token=…", valid 72h) the actor shares by hand. Throws
 *   AccountError("forbidden" | "email_taken" | "invalid"). Owner may create
 *   owner, admin and lawyer; admin may create lawyer only. Lawyers require a
 *   country. Audit "user.create".
 * - issueSetupLink(userId, actor): new one-time setup link (password reset /
 *   re-invite). Invalidates older links. Audit "user.setup_link".
 * - completeSetup(token, password): consume a setup token, set the password
 *   (min 12 chars), mark active, start a session. Audit "user.setup_complete".
 * - changePassword(userId, current, next, keepSessionId?): checks current;
 *   revokes every session except keepSessionId (SessionUser.session_id of the
 *   requester); with no keepSessionId, revokes all. Audit "user.password_change".
 * - setUserStatus(userId, status, actor): suspend or reactivate. Suspending
 *   revokes sessions. Never leaves zero active owners. Throws
 *   AccountError("forbidden" | "last_owner" | "not_found"). Audit
 *   "user.suspend" / "user.reactivate".
 * - getUser, listUsers(filter), listAudit({ limit, targetId }) (newest first), recordAudit.
 * - canManage(actor, target): owner: anyone but self-suspend; admin: lawyers only.
 * - creatableRoles(actor): owner: owner/admin/lawyer; admin: lawyer; lawyer: none.
 * - accountsAvailable(): true when the accounts database is reachable and migrated.
 */
export * from "./types";

export {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  AccountError,
  signIn,
  signOut,
  getSessionUser,
  revokeAllSessions,
  createUser,
  issueSetupLink,
  completeSetup,
  changePassword,
  setUserStatus,
  getUser,
  listUsers,
  listAudit,
  recordAudit,
  canManage,
  creatableRoles,
  accountsAvailable,
} from "./service";
