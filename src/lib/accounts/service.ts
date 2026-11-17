/**
 * Accounts service: users, database sessions, one-time setup links and the
 * audit log. Import from "@/lib/accounts", not from this file.
 *
 * - Raw tokens (session cookies, setup links) are 32 random bytes, base64url.
 *   Only their sha256 hashes are stored.
 * - Sessions last 12 hours from sign-in; last_seen_at is touched at most every 5 minutes.
 * - On first use with an empty users table, each ADMIN_USERS entry becomes an
 *   active owner (password hash carried over).
 */
import crypto from "node:crypto";
import { clearFailures, hashPassword, noteFailure, parseAdminUsers, throttled, verifyPassword } from "@/lib/admin/auth";
import { getDriver, type SqlRunner } from "@/lib/db";
import type { Actor, AuditEntry, Country, Role, SessionUser, SetupError, SignInError, User, UserStatus } from "./types";

export const SESSION_COOKIE = "ds_session";
export const SESSION_TTL_SECONDS = 12 * 60 * 60;
export const SETUP_TTL_SECONDS = 72 * 60 * 60;
export const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 1000;
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;
const EMAIL_FAILURE_LIMIT = 5;
/** Much higher than the per-email limit: many people can share one IP (an office, a university). */
const IP_FAILURE_LIMIT = 30;
const EMAIL_FAILURE_WINDOW = "15 minutes";
/** Lock key serialising changes that could leave zero active owners, and the bootstrap. */
const OWNER_LOCK_KEY = 7340212;

export class AccountError extends Error {
  constructor(public code: "forbidden" | "email_taken" | "invalid" | "last_owner" | "not_found") {
    super(code);
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

const newToken = () => crypto.randomBytes(32).toString("base64url");
const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
/** Raw tokens are 43 characters of base64url. */
export const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES: Role[] = ["owner", "admin", "lawyer"];
const COUNTRIES: Country[] = ["IN", "DE"];

const iso = (v: unknown): string => (v instanceof Date ? v.toISOString() : new Date(String(v)).toISOString());
const isoOrNull = (v: unknown): string | null => (v == null ? null : iso(v));
const normEmail = (e: string) => e.trim().toLowerCase();

function rowToUser(r: Record<string, unknown>): User {
  return {
    id: String(r.id),
    email: String(r.email).toLowerCase(),
    name: String(r.name),
    role: r.role as Role,
    status: r.status as UserStatus,
    country: (r.country as Country | null) ?? null,
    created_at: iso(r.created_at),
    last_login_at: isoOrNull(r.last_login_at),
  };
}

const USER_COLS = "id, email, name, role, status, country, created_at, last_login_at";

let dummyHash: string | undefined;
/** Unknown emails still pay for one scrypt, so timing does not reveal accounts. */
const dummy = () => (dummyHash ??= hashPassword(crypto.randomBytes(16).toString("hex")));

// ── Readiness and bootstrap ────────────────────────────────────────────────

const bootstrapped = new WeakSet<SqlRunner>();

/** Database runner with migrations applied and ADMIN_USERS bootstrapped, or null. */
async function ready(): Promise<SqlRunner | null> {
  const driver = await getDriver();
  if (!driver) return null;
  if (!bootstrapped.has(driver.run)) {
    await driver.transaction(async (run) => {
      await run("SELECT pg_advisory_xact_lock($1::bigint)", [OWNER_LOCK_KEY]);
      const [{ n }] = await run("SELECT count(*)::int AS n FROM users");
      if (Number(n) > 0) return;
      for (const [email, hash] of parseAdminUsers(process.env.ADMIN_USERS)) {
        const rows = await run(
          `INSERT INTO users (email, name, role, status, password_hash)
           VALUES ($1, $2, 'owner', 'active', $3)
           ON CONFLICT ((lower(email))) DO NOTHING RETURNING id`,
          [email, email.split("@")[0], hash],
        );
        if (rows[0]) await audit(run, { actor_user_id: null, action: "user.bootstrap", target_type: "user", target_id: String(rows[0].id), details: { role: "owner" } });
      }
    });
    bootstrapped.add(driver.run);
  }
  return driver.run;
}

async function requireDb(): Promise<SqlRunner> {
  const run = await ready();
  if (!run) throw new Error("No database is configured.");
  return run;
}

async function withTx<T>(fn: (run: SqlRunner) => Promise<T>): Promise<T> {
  await requireDb();
  const driver = await getDriver();
  return driver!.transaction(fn);
}

async function audit(run: SqlRunner, e: Omit<AuditEntry, "id" | "created_at" | "actor_email">) {
  await run(
    "INSERT INTO audit_log (actor_user_id, action, target_type, target_id, details) VALUES ($1, $2, $3, $4, $5::jsonb)",
    [e.actor_user_id, e.action, e.target_type, e.target_id, JSON.stringify(e.details ?? {})],
  );
}

export async function accountsAvailable(): Promise<boolean> {
  try {
    return !!(await ready());
  } catch (e) {
    console.error(`[accounts] database unavailable: ${(e as Error).name}`);
    return false;
  }
}

export async function recordAudit(entry: Omit<AuditEntry, "id" | "created_at" | "actor_email">): Promise<void> {
  await audit(await requireDb(), entry);
}

// ── Sessions ───────────────────────────────────────────────────────────────

async function startSession(run: SqlRunner, userId: string): Promise<string> {
  const token = newToken();
  await run(`INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, now() + $3::int * interval '1 second')`, [
    sha256(token),
    userId,
    SESSION_TTL_SECONDS,
  ]);
  return token;
}

async function revokeSessions(run: SqlRunner, userId: string, except?: string) {
  await run("UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL AND id <> $2", [userId, except ?? ""]);
}

export async function signIn(
  email: string,
  password: string,
  meta: { ip?: string },
): Promise<{ ok: true; token: string; user: User } | { ok: false; error: SignInError }> {
  let run: SqlRunner | null;
  try {
    run = await ready();
  } catch {
    run = null;
  }
  if (!run) return { ok: false, error: "unavailable" };

  const key = normEmail(email);
  const ipKey = `ip:${meta.ip ?? "unknown"}`;
  const emailKey = `email:${key}`;
  if (throttled(ipKey, Date.now(), IP_FAILURE_LIMIT) || throttled(emailKey, Date.now(), EMAIL_FAILURE_LIMIT)) return { ok: false, error: "throttled" };

  const [row] = await run(`SELECT ${USER_COLS}, password_hash FROM users WHERE lower(email) = $1`, [key]);
  if (row) {
    // Per-email limit across instances: failed sign-ins recorded in the audit log.
    const [{ n }] = await run(
      `SELECT count(*)::int AS n FROM audit_log WHERE action = 'auth.login_failed' AND target_id = $1 AND created_at > now() - interval '${EMAIL_FAILURE_WINDOW}'`,
      [String(row.id)],
    );
    if (Number(n) >= EMAIL_FAILURE_LIMIT) return { ok: false, error: "throttled" };
  }

  const stored = row?.password_hash ? String(row.password_hash) : null;
  const ok = verifyPassword(password.slice(0, MAX_PASSWORD_LENGTH), stored ?? dummy());
  if (!ok || !row || !stored) {
    noteFailure(ipKey);
    noteFailure(emailKey);
    if (row) await audit(run, { actor_user_id: null, action: "auth.login_failed", target_type: "user", target_id: String(row.id), details: {} });
    return { ok: false, error: "invalid" };
  }
  if (row.status === "suspended") return { ok: false, error: "suspended" };
  if (row.status !== "active") return { ok: false, error: "invalid" };

  clearFailures(ipKey);
  clearFailures(emailKey);
  const user = rowToUser(row);
  const token = await startSession(run, user.id);
  const [updated] = await run(`UPDATE users SET last_login_at = now() WHERE id = $1 RETURNING ${USER_COLS}`, [user.id]);
  await audit(run, { actor_user_id: user.id, action: "auth.login", target_type: "user", target_id: user.id, details: {} });
  return { ok: true, token, user: rowToUser(updated ?? row) };
}

export async function signOut(token: string): Promise<void> {
  if (!TOKEN_RE.test(token)) return;
  const run = await ready();
  if (!run) return;
  const [row] = await run("UPDATE sessions SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL RETURNING user_id", [sha256(token)]);
  if (row) await audit(run, { actor_user_id: String(row.user_id), action: "auth.logout", target_type: "user", target_id: String(row.user_id), details: {} });
}

export async function getSessionUser(token: string | undefined): Promise<SessionUser | null> {
  if (!token || !TOKEN_RE.test(token)) return null;
  const run = await ready();
  if (!run) return null;
  const id = sha256(token);
  const [row] = await run(
    `SELECT u.id, u.email, u.name, u.role, u.status, u.country, u.created_at, u.last_login_at,
            s.last_seen_at < now() - $2::int * interval '1 millisecond' AS session_stale
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.id = $1 AND s.revoked_at IS NULL AND s.expires_at > now() AND u.status = 'active'`,
    [id, TOUCH_INTERVAL_MS],
  );
  if (!row) return null;
  // Compared in SQL: no Date.now() during rendering (Cache Components).
  if (row.session_stale) {
    await run("UPDATE sessions SET last_seen_at = now() WHERE id = $1", [id]);
  }
  const user = rowToUser(row);
  return { ...user, session_id: id };
}

/**
 * Revoke every session of a user. Allowed for the user themself, for an actor
 * who canManage them, and for the system (actor null); otherwise throws
 * AccountError("forbidden").
 */
export async function revokeAllSessions(userId: string, actor: Actor | null): Promise<void> {
  const run = await requireDb();
  const target = await getUser(userId);
  if (!target) throw new AccountError("not_found");
  if (actor && actor.id !== userId && !canManage(actor, target)) throw new AccountError("forbidden");
  await revokeSessions(run, userId);
  await audit(run, { actor_user_id: actor?.id ?? null, action: "session.revoke_all", target_type: "user", target_id: userId, details: {} });
}

// ── Users ──────────────────────────────────────────────────────────────────

export function canManage(actor: Actor, target: Pick<User, "id" | "role">): boolean {
  if (actor.role === "owner") return true; // self-suspend is refused in setUserStatus
  if (actor.role === "admin") return target.role === "lawyer";
  return false;
}

export function creatableRoles(actor: Actor): Role[] {
  if (actor.role === "owner") return ["owner", "admin", "lawyer"];
  if (actor.role === "admin") return ["lawyer"];
  return [];
}

async function newSetupLink(run: SqlRunner, userId: string): Promise<string> {
  // Issuing a new link invalidates older unused ones.
  await run("UPDATE account_tokens SET used_at = now() WHERE user_id = $1 AND used_at IS NULL", [userId]);
  const token = newToken();
  await run(
    `INSERT INTO account_tokens (token_hash, user_id, purpose, expires_at) VALUES ($1, $2, 'setup', now() + $3::int * interval '1 second')`,
    [sha256(token), userId, SETUP_TTL_SECONDS],
  );
  return `/account/setup?token=${token}`;
}

export async function createUser(
  input: { email: string; name: string; role: Role; country?: Country | null },
  actor: Actor,
): Promise<{ user: User; setupPath: string }> {
  if (!creatableRoles(actor).includes(input.role)) throw new AccountError("forbidden");
  const email = normEmail(input.email ?? "");
  const name = (input.name ?? "").trim();
  if (!ROLES.includes(input.role) || !EMAIL_RE.test(email) || email.length > 200 || !name || name.length > 200) {
    throw new AccountError("invalid");
  }
  const country = input.role === "lawyer" ? (input.country ?? null) : null;
  if (input.role === "lawyer" && (!country || !COUNTRIES.includes(country))) throw new AccountError("invalid");

  return withTx(async (run) => {
    const rows = await run(
      `INSERT INTO users (email, name, role, status, country, created_by) VALUES ($1, $2, $3, 'invited', $4, $5)
       ON CONFLICT ((lower(email))) DO NOTHING RETURNING ${USER_COLS}`,
      [email, name, input.role, country, actor.id],
    );
    if (!rows[0]) throw new AccountError("email_taken");
    const user = rowToUser(rows[0]);
    const setupPath = await newSetupLink(run, user.id);
    await audit(run, { actor_user_id: actor.id, action: "user.create", target_type: "user", target_id: user.id, details: { role: user.role, country: user.country } });
    return { user, setupPath };
  });
}

/** Suspended users get no setup link (it would reactivate them): reactivate first. */
export async function issueSetupLink(userId: string, actor: Actor): Promise<{ setupPath: string }> {
  const target = await getUser(userId);
  if (!target) throw new AccountError("not_found");
  if (!canManage(actor, target)) throw new AccountError("forbidden");
  if (target.status === "suspended") throw new AccountError("invalid");
  return withTx(async (run) => {
    const setupPath = await newSetupLink(run, userId);
    await audit(run, { actor_user_id: actor.id, action: "user.setup_link", target_type: "user", target_id: userId, details: {} });
    return { setupPath };
  });
}

const weak = (pw: string) => typeof pw !== "string" || pw.length < MIN_PASSWORD_LENGTH || pw.length > MAX_PASSWORD_LENGTH;

export async function completeSetup(
  token: string,
  password: string,
): Promise<{ ok: true; token: string; user: User } | { ok: false; error: SetupError }> {
  let run: SqlRunner | null;
  try {
    run = await ready();
  } catch {
    run = null;
  }
  if (!run) return { ok: false, error: "unavailable" };
  if (!token || !TOKEN_RE.test(token)) return { ok: false, error: "invalid_token" };
  const hash = sha256(token);
  const [t] = await run("SELECT used_at, expires_at <= now() AS expired FROM account_tokens WHERE token_hash = $1", [hash]);
  if (!t || t.used_at != null) return { ok: false, error: "invalid_token" };
  if (t.expired) return { ok: false, error: "expired_token" };
  // Checked before consuming, so a weak password does not burn the link.
  if (weak(password)) return { ok: false, error: "weak_password" };
  const pwHash = hashPassword(password);

  const result = await withTx(async (tx) => {
    const [used] = await tx(
      "UPDATE account_tokens SET used_at = now() WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now() RETURNING user_id",
      [hash],
    );
    if (!used) return null;
    const userId = String(used.user_id);
    const [u] = await tx(
      `UPDATE users SET password_hash = $2, status = 'active', last_login_at = now() WHERE id = $1 AND status <> 'suspended' RETURNING ${USER_COLS}`,
      [userId, pwHash],
    );
    if (!u) return null;
    await revokeSessions(tx, userId);
    const session = await startSession(tx, userId);
    await audit(tx, { actor_user_id: userId, action: "user.setup_complete", target_type: "user", target_id: userId, details: {} });
    return { token: session, user: rowToUser(u) };
  });
  return result ? { ok: true, ...result } : { ok: false, error: "invalid_token" };
}

/**
 * Revokes every session of the user except keepSessionId (the session id, as
 * in SessionUser.session_id, of the request making the change). Without
 * keepSessionId, every session is revoked.
 */
export async function changePassword(
  userId: string,
  current: string,
  next: string,
  keepSessionId?: string,
): Promise<{ ok: true } | { ok: false; error: "invalid_current" | "weak_password" }> {
  const run = await requireDb();
  const [row] = UUID_RE.test(userId) ? await run("SELECT password_hash FROM users WHERE id = $1 AND status = 'active'", [userId]) : [];
  const stored = row?.password_hash ? String(row.password_hash) : null;
  const ok = verifyPassword(String(current ?? "").slice(0, MAX_PASSWORD_LENGTH), stored ?? dummy());
  if (!ok || !stored) return { ok: false, error: "invalid_current" };
  if (weak(next)) return { ok: false, error: "weak_password" };
  const pwHash = hashPassword(next);
  await withTx(async (tx) => {
    await tx("UPDATE users SET password_hash = $2 WHERE id = $1", [userId, pwHash]);
    await revokeSessions(tx, userId, keepSessionId);
    await audit(tx, { actor_user_id: userId, action: "user.password_change", target_type: "user", target_id: userId, details: {} });
  });
  return { ok: true };
}

export async function setUserStatus(userId: string, status: Exclude<UserStatus, "invited">, actor: Actor): Promise<User> {
  if (status !== "active" && status !== "suspended") throw new AccountError("invalid");
  const target = await getUser(userId);
  if (!target) throw new AccountError("not_found");
  if (!canManage(actor, target)) throw new AccountError("forbidden");
  if (status === "suspended" && actor.id === userId) throw new AccountError("forbidden");

  return withTx(async (run) => {
    await run("SELECT pg_advisory_xact_lock($1::bigint)", [OWNER_LOCK_KEY]);
    if (status === "suspended") {
      const [{ others }] = await run(
        "SELECT count(*)::int AS others FROM users WHERE role = 'owner' AND status = 'active' AND id <> $1",
        [userId],
      );
      const [{ me }] = await run("SELECT count(*)::int AS me FROM users WHERE id = $1 AND role = 'owner' AND status = 'active'", [userId]);
      if (Number(me) > 0 && Number(others) === 0) throw new AccountError("last_owner");
      const [u] = await run(`UPDATE users SET status = 'suspended' WHERE id = $1 RETURNING ${USER_COLS}`, [userId]);
      await revokeSessions(run, userId);
      await run("UPDATE account_tokens SET used_at = now() WHERE user_id = $1 AND used_at IS NULL", [userId]);
          await audit(run, { actor_user_id: actor.id, action: "user.suspend", target_type: "user", target_id: userId, details: {} });
      return rowToUser(u);
    }
    // Reactivating someone who never set a password puts them back to "invited".
    const [u] = await run(
      `UPDATE users SET status = CASE WHEN password_hash IS NULL THEN 'invited' ELSE 'active' END WHERE id = $1 RETURNING ${USER_COLS}`,
      [userId],
    );
    await audit(run, { actor_user_id: actor.id, action: "user.reactivate", target_type: "user", target_id: userId, details: {} });
    return rowToUser(u);
  });
}

export async function getUser(id: string): Promise<User | null> {
  if (!UUID_RE.test(id ?? "")) return null;
  const run = await requireDb();
  const [row] = await run(`SELECT ${USER_COLS} FROM users WHERE id = $1`, [id]);
  return row ? rowToUser(row) : null;
}

export async function listUsers(filter?: { role?: Role; status?: UserStatus }): Promise<User[]> {
  const run = await requireDb();
  const rows = await run(
    `SELECT ${USER_COLS} FROM users WHERE ($1::text IS NULL OR role = $1) AND ($2::text IS NULL OR status = $2) ORDER BY created_at, email`,
    [filter?.role ?? null, filter?.status ?? null],
  );
  return rows.map(rowToUser);
}

export async function listAudit(opts?: { limit?: number; targetId?: string }): Promise<AuditEntry[]> {
  const run = await requireDb();
  const limit = Math.min(Math.max(Math.floor(opts?.limit ?? 100), 1), 1000);
  const rows = await run(
    `SELECT a.id, a.actor_user_id, u.email AS actor_email, a.action, a.target_type, a.target_id, a.details, a.created_at
     FROM audit_log a LEFT JOIN users u ON u.id = a.actor_user_id
     WHERE ($1::text IS NULL OR a.target_id = $1)
     ORDER BY a.id DESC LIMIT $2`,
    [opts?.targetId ?? null, limit],
  );
  return rows.map((r) => ({
    id: Number(r.id),
    actor_user_id: r.actor_user_id == null ? null : String(r.actor_user_id),
    actor_email: r.actor_email == null ? null : String(r.actor_email).toLowerCase(),
    action: String(r.action),
    target_type: r.target_type == null ? null : String(r.target_type),
    target_id: r.target_id == null ? null : String(r.target_id),
    details: (typeof r.details === "string" ? JSON.parse(r.details) : (r.details ?? {})) as Record<string, unknown>,
    created_at: iso(r.created_at),
  }));
}
