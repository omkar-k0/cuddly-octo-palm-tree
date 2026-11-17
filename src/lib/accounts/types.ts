/**
 * CONTRACT (step 1): account types shared by the data layer, the team
 * dashboard and the onboarding framework. Change only by agreement.
 */

/** owner: you; manages everyone. admin: team member; manages lawyers. lawyer: reviews sources. */
export type Role = "owner" | "admin" | "lawyer";

/** invited: created, password not yet set. active: can sign in. suspended: cannot sign in. */
export type UserStatus = "invited" | "active" | "suspended";

export type Country = "IN" | "DE";

export interface User {
  id: string; // uuid
  email: string; // lower-case
  name: string;
  role: Role;
  status: UserStatus;
  /** Lawyers belong to one country; owner/admin are null (all countries). */
  country: Country | null;
  created_at: string; // ISO
  last_login_at: string | null; // ISO
}

/** The signed-in user for this request. */
export interface SessionUser extends User {
  session_id: string;
}

export interface AuditEntry {
  id: number;
  actor_user_id: string | null; // null = system (e.g. bootstrap)
  actor_email: string | null;
  action: string; // e.g. "user.create", "user.suspend", "session.revoke_all", "auth.login"
  target_type: string | null; // e.g. "user", "application"
  target_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export type SignInError = "invalid" | "suspended" | "throttled" | "unavailable";
export type SetupError = "invalid_token" | "expired_token" | "weak_password" | "unavailable";

/** Who may manage whom. Implemented in service.ts (canManage); UI uses it to show/hide actions. */
export interface Actor {
  id: string;
  role: Role;
}
