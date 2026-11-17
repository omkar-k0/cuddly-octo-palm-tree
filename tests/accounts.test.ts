import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { driverFromRunner, getDb, setDbForTests, type SqlRunner } from "@/lib/db";
import { migrations, runMigrations } from "@/lib/db/migrations";
import { hashPassword, resetThrottleForTests } from "@/lib/admin/auth";
import {
  AccountError,
  accountsAvailable,
  canManage,
  changePassword,
  completeSetup,
  createUser,
  creatableRoles,
  getSessionUser,
  getUser,
  issueSetupLink,
  listAudit,
  listUsers,
  recordAudit,
  revokeAllSessions,
  setUserStatus,
  signIn,
  signOut,
  type Actor,
  type User,
} from "@/lib/accounts";

const OWNER_PW = "owner password 123";
const ownerHash = hashPassword(OWNER_PW);
let db: PGlite;
let run: SqlRunner;
let ipSeq = 0;
/** A fresh IP per sign-in attempt group, so the in-memory per-IP throttle does not leak between tests. */
const ip = () => `10.0.0.${++ipSeq}`;

beforeEach(async () => {
  resetThrottleForTests();
  process.env.ADMIN_USERS = `Owner@Example.com:${ownerHash}`;
  db = new PGlite();
  const raw: SqlRunner = async (text, params) => (await db.query<Record<string, unknown>>(text, params)).rows;
  setDbForTests(raw);
  run = (await getDb())!;
});
afterEach(async () => {
  setDbForTests(null);
  delete process.env.ADMIN_USERS;
  await db.close();
});

async function owner(): Promise<User> {
  const [u] = await listUsers({ role: "owner" });
  return u;
}
const tokenOf = (path: string) => new URL(path, "https://x.test").searchParams.get("token")!;
const asActor = (u: User): Actor => ({ id: u.id, role: u.role });

/** Create a user and complete setup; returns the user and a session token. */
async function makeUser(actor: Actor, role: "owner" | "admin" | "lawyer", email: string, password = "a long password 1") {
  const { user, setupPath } = await createUser({ email, name: email.split("@")[0], role, country: role === "lawyer" ? "IN" : null }, actor);
  const done = await completeSetup(tokenOf(setupPath), password);
  if (!done.ok) throw new Error(done.error);
  return { user: done.user, token: done.token, password, created: user };
}

describe("migrations", () => {
  it("are idempotent and recorded", async () => {
    const tables = (await run("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1")).map((r) => r.table_name);
    expect(tables).toEqual(expect.arrayContaining(["schema_migrations", "source_verifications", "users", "sessions", "account_tokens", "audit_log"]));
    const ids = (await run("SELECT id FROM schema_migrations ORDER BY id")).map((r) => r.id);
    expect(ids).toEqual(migrations.map((m) => m.id));

    // A second runner on the same database (e.g. another process) applies nothing.
    const again = await runMigrations(driverFromRunner(async (t, p) => (await db.query<Record<string, unknown>>(t, p)).rows));
    expect(again).toEqual([]);
    // Re-running every statement is harmless too.
    const fresh = driverFromRunner(async (t, p) => (await db.query<Record<string, unknown>>(t, p)).rows);
    await run("DELETE FROM schema_migrations");
    expect(await runMigrations(fresh)).toEqual(migrations.map((m) => m.id));
    const cols = (await run("SELECT column_name FROM information_schema.columns WHERE table_name = 'source_verifications'")).map((r) => r.column_name);
    expect(cols).toContain("reviewer_user_id");
  });
});

describe("bootstrap from ADMIN_USERS", () => {
  it("turns each entry into an active owner, once", async () => {
    expect(await accountsAvailable()).toBe(true);
    const users = await listUsers();
    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({ email: "owner@example.com", name: "owner", role: "owner", status: "active", country: null });
    const audit = await listAudit();
    expect(audit.map((a) => a.action)).toEqual(["user.bootstrap"]);
    expect(audit[0].actor_user_id).toBeNull();

    // The carried-over hash works for sign-in.
    const r = await signIn("owner@example.com", OWNER_PW, { ip: ip() });
    expect(r.ok).toBe(true);
    // Users exist now: a later bootstrap (new process) adds nobody.
    process.env.ADMIN_USERS = `other@example.com:${ownerHash}`;
    setDbForTests(async (t, p) => (await db.query<Record<string, unknown>>(t, p)).rows);
    expect(await listUsers()).toHaveLength(1);
  });

  it("is unavailable with no database", async () => {
    setDbForTests(null);
    const env = process.env as Record<string, string | undefined>;
    const prev = { VERCEL: env.VERCEL, DATABASE_URL: env.DATABASE_URL };
    env.VERCEL = "1";
    delete env.DATABASE_URL;
    try {
      expect(await accountsAvailable()).toBe(false);
      expect(await signIn("owner@example.com", OWNER_PW, { ip: ip() })).toEqual({ ok: false, error: "unavailable" });
      expect(await getSessionUser("a".repeat(43))).toBeNull();
    } finally {
      if (prev.VERCEL === undefined) delete env.VERCEL;
      else env.VERCEL = prev.VERCEL;
      delete (globalThis as { __demFragenDb?: unknown }).__demFragenDb;
      if (prev.DATABASE_URL) env.DATABASE_URL = prev.DATABASE_URL;
    }
  });
});

describe("sign-in and sessions", () => {
  it("signs in case-insensitively and returns a session", async () => {
    const r = await signIn("  OWNER@example.com ", OWNER_PW, { ip: ip() });
    if (!r.ok) throw new Error(r.error);
    expect(r.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(r.user.last_login_at).not.toBeNull();
    const s = await getSessionUser(r.token);
    expect(s?.email).toBe("owner@example.com");
    expect(s?.session_id).toMatch(/^[0-9a-f]{64}$/);
    // Only the hash is stored.
    const [row] = await run("SELECT count(*)::int AS n FROM sessions WHERE id = $1", [r.token]);
    expect(row.n).toBe(0);
    expect((await listAudit()).some((a) => a.action === "auth.login")).toBe(true);
  });

  it("rejects wrong passwords and unknown emails alike", async () => {
    expect(await signIn("owner@example.com", "wrong password!", { ip: ip() })).toEqual({ ok: false, error: "invalid" });
    expect(await signIn("nobody@example.com", OWNER_PW, { ip: ip() })).toEqual({ ok: false, error: "invalid" });
    expect(await getSessionUser("not a token")).toBeNull();
    expect(await getSessionUser(undefined)).toBeNull();
    expect(await getSessionUser("b".repeat(43))).toBeNull();
  });

  it("refuses suspended users and ends their sessions at once", async () => {
    const o = await owner();
    const lawyer = await makeUser(asActor(o), "lawyer", "lawyer@example.com");
    expect(await getSessionUser(lawyer.token)).not.toBeNull();
    await setUserStatus(lawyer.user.id, "suspended", asActor(o));
    expect(await getSessionUser(lawyer.token)).toBeNull();
    expect(await signIn("lawyer@example.com", lawyer.password, { ip: ip() })).toEqual({ ok: false, error: "suspended" });
    await setUserStatus(lawyer.user.id, "active", asActor(o));
    expect((await signIn("lawyer@example.com", lawyer.password, { ip: ip() })).ok).toBe(true);
  });

  it("throttles per IP and per email", async () => {
    const a = ip();
    for (let i = 0; i < 5; i++) await signIn(`x${i}@example.com`, "nope nope nope", { ip: a });
    expect(await signIn("owner@example.com", OWNER_PW, { ip: a })).toEqual({ ok: false, error: "throttled" });

    // Five failures for one account from different IPs lock that account for 15 minutes.
    resetThrottleForTests();
    for (let i = 0; i < 5; i++) await signIn("owner@example.com", "wrong password!", { ip: ip() });
    resetThrottleForTests(); // as if on another instance: the database count still applies
    expect(await signIn("owner@example.com", OWNER_PW, { ip: ip() })).toEqual({ ok: false, error: "throttled" });
    // After 15 minutes the database count no longer applies.
    await run("UPDATE audit_log SET created_at = now() - interval '16 minutes' WHERE action = 'auth.login_failed'");
    expect((await signIn("owner@example.com", OWNER_PW, { ip: ip() })).ok).toBe(true);
  });

  it("expires sessions after 12 hours and revokes on sign-out", async () => {
    const r = await signIn("owner@example.com", OWNER_PW, { ip: ip() });
    if (!r.ok) throw new Error(r.error);
    const [row] = await run("SELECT expires_at - created_at AS ttl FROM sessions");
    expect(String(row.ttl)).toMatch(/12:00:00|12 hours/);
    await run("UPDATE sessions SET expires_at = now() - interval '1 second'");
    expect(await getSessionUser(r.token)).toBeNull();

    const r2 = await signIn("owner@example.com", OWNER_PW, { ip: ip() });
    if (!r2.ok) throw new Error(r2.error);
    expect(await getSessionUser(r2.token)).not.toBeNull();
    await signOut(r2.token);
    expect(await getSessionUser(r2.token)).toBeNull();
    await signOut("unknown"); // no-op
  });

  it("touches last_seen_at at most every 5 minutes", async () => {
    const r = await signIn("owner@example.com", OWNER_PW, { ip: ip() });
    if (!r.ok) throw new Error(r.error);
    await run("UPDATE sessions SET last_seen_at = now() - interval '2 minutes'");
    await getSessionUser(r.token);
    const [a] = await run("SELECT now() - last_seen_at > interval '1 minute' AS old FROM sessions");
    expect(a.old).toBe(true);
    await run("UPDATE sessions SET last_seen_at = now() - interval '6 minutes'");
    await getSessionUser(r.token);
    const [b] = await run("SELECT now() - last_seen_at < interval '1 minute' AS fresh FROM sessions");
    expect(b.fresh).toBe(true);
  });

  it("revokeAllSessions ends every session", async () => {
    const o = await owner();
    const r1 = await signIn("owner@example.com", OWNER_PW, { ip: ip() });
    const r2 = await signIn("owner@example.com", OWNER_PW, { ip: ip() });
    if (!r1.ok || !r2.ok) throw new Error("sign-in failed");
    await revokeAllSessions(o.id, asActor(o));
    expect(await getSessionUser(r1.token)).toBeNull();
    expect(await getSessionUser(r2.token)).toBeNull();
    expect((await listAudit({ targetId: o.id }))[0].action).toBe("session.revoke_all");
  });
});

describe("users", () => {
  it("applies role rules for creating users", async () => {
    const o = asActor(await owner());
    const admin = await makeUser(o, "admin", "admin@example.com");
    const a = asActor(admin.user);
    await expect(createUser({ email: "a2@example.com", name: "A2", role: "admin" }, a)).rejects.toMatchObject({ code: "forbidden" });
    await expect(createUser({ email: "o2@example.com", name: "O2", role: "owner" }, a)).rejects.toMatchObject({ code: "forbidden" });
    const l = await createUser({ email: "l@example.com", name: "L", role: "lawyer", country: "DE" }, a);
    expect(l.user).toMatchObject({ role: "lawyer", status: "invited", country: "DE" });
    expect(l.setupPath).toMatch(/^\/account\/setup\?token=[A-Za-z0-9_-]{43}$/);
    const lawyer = await makeUser(o, "lawyer", "l2@example.com");
    await expect(createUser({ email: "l3@example.com", name: "L3", role: "lawyer", country: "IN" }, asActor(lawyer.user))).rejects.toMatchObject({ code: "forbidden" });
    // Lawyers need a country; owners and admins get none.
    await expect(createUser({ email: "l4@example.com", name: "L4", role: "lawyer" }, o)).rejects.toMatchObject({ code: "invalid" });
    const ad2 = await createUser({ email: "ad2@example.com", name: "Ad2", role: "admin", country: "IN" }, o);
    expect(ad2.user.country).toBeNull();
    await expect(createUser({ email: "not-an-email", name: "X", role: "admin" }, o)).rejects.toBeInstanceOf(AccountError);
    await expect(createUser({ email: "x@example.com", name: "  ", role: "admin" }, o)).rejects.toMatchObject({ code: "invalid" });
  });

  it("keeps emails unique, case-insensitively", async () => {
    const o = asActor(await owner());
    await createUser({ email: "dup@example.com", name: "D", role: "admin" }, o);
    await expect(createUser({ email: "DUP@Example.com", name: "D2", role: "admin" }, o)).rejects.toMatchObject({ code: "email_taken" });
    await expect(createUser({ email: "owner@example.com", name: "O", role: "owner" }, o)).rejects.toMatchObject({ code: "email_taken" });
  });

  it("setup links: single use, expire after 72h, newer links invalidate older ones", async () => {
    const o = asActor(await owner());
    const { user, setupPath } = await createUser({ email: "new@example.com", name: "New", role: "admin" }, o);
    const t1 = tokenOf(setupPath);
    const [row] = await run("SELECT expires_at - created_at AS ttl FROM account_tokens");
    expect(String(row.ttl)).toMatch(/72:00:00|3 days/);
    // Weak passwords do not burn the link.
    expect(await completeSetup(t1, "short")).toEqual({ ok: false, error: "weak_password" });

    const { setupPath: p2 } = await issueSetupLink(user.id, o);
    const t2 = tokenOf(p2);
    expect(await completeSetup(t1, "a long password 1")).toEqual({ ok: false, error: "invalid_token" });

    const done = await completeSetup(t2, "a long password 1");
    if (!done.ok) throw new Error(done.error);
    expect(done.user.status).toBe("active");
    expect((await getSessionUser(done.token))?.id).toBe(user.id);
    expect(await completeSetup(t2, "a long password 2")).toEqual({ ok: false, error: "invalid_token" });
    expect((await signIn("new@example.com", "a long password 1", { ip: ip() })).ok).toBe(true);

    const { setupPath: p3 } = await issueSetupLink(user.id, o);
    await run("UPDATE account_tokens SET expires_at = now() - interval '1 second' WHERE used_at IS NULL");
    expect(await completeSetup(tokenOf(p3), "a long password 3")).toEqual({ ok: false, error: "expired_token" });
    expect(await completeSetup("garbage", "a long password 3")).toEqual({ ok: false, error: "invalid_token" });
    // Only hashes are stored.
    const [stored] = await run("SELECT count(*)::int AS n FROM account_tokens WHERE token_hash = $1", [tokenOf(p3)]);
    expect(stored.n).toBe(0);
  });

  it("changePassword checks the current password and revokes other sessions", async () => {
    const o = await owner();
    const other = await signIn("owner@example.com", OWNER_PW, { ip: ip() });
    const mine = await signIn("owner@example.com", OWNER_PW, { ip: ip() });
    if (!other.ok || !mine.ok) throw new Error("sign-in failed");
    const me = await getSessionUser(mine.token);
    expect(await changePassword(o.id, "wrong password!", "new password 456", me!.session_id)).toEqual({ ok: false, error: "invalid_current" });
    expect(await changePassword(o.id, OWNER_PW, "short", me!.session_id)).toEqual({ ok: false, error: "weak_password" });
    expect(await getSessionUser(other.token)).not.toBeNull();
    expect(await changePassword(o.id, OWNER_PW, "new password 456", me!.session_id)).toEqual({ ok: true });
    expect(await getSessionUser(other.token)).toBeNull();
    expect(await getSessionUser(mine.token)).not.toBeNull();
    expect((await signIn("owner@example.com", "new password 456", { ip: ip() })).ok).toBe(true);
    expect((await signIn("owner@example.com", OWNER_PW, { ip: ip() })).ok).toBe(false);
  });

  it("changePassword keeps the session it is told to keep, not the one validated last", async () => {
    const o = await owner();
    const a = await signIn("owner@example.com", OWNER_PW, { ip: ip() });
    const b = await signIn("owner@example.com", OWNER_PW, { ip: ip() });
    if (!a.ok || !b.ok) throw new Error("sign-in failed");
    const sessionA = await getSessionUser(a.token);
    await getSessionUser(b.token); // B is validated last, e.g. by a near-simultaneous request
    expect(await changePassword(o.id, OWNER_PW, "new password 456", sessionA!.session_id)).toEqual({ ok: true });
    expect(await getSessionUser(a.token)).not.toBeNull();
    expect(await getSessionUser(b.token)).toBeNull();
  });

  it("changePassword without keepSessionId revokes every session", async () => {
    const o = await owner();
    const a = await signIn("owner@example.com", OWNER_PW, { ip: ip() });
    const b = await signIn("owner@example.com", OWNER_PW, { ip: ip() });
    if (!a.ok || !b.ok) throw new Error("sign-in failed");
    expect(await changePassword(o.id, OWNER_PW, "new password 456")).toEqual({ ok: true });
    expect(await getSessionUser(a.token)).toBeNull();
    expect(await getSessionUser(b.token)).toBeNull();
  });

  it("never leaves zero active owners", async () => {
    const o = await owner();
    await expect(setUserStatus(o.id, "suspended", asActor(o))).rejects.toMatchObject({ code: "forbidden" });
    const second = await makeUser(asActor(o), "owner", "second@example.com");
    // Second owner suspends the first: allowed, one active owner remains.
    await setUserStatus(o.id, "suspended", asActor(second.user));
    expect((await getUser(o.id))?.status).toBe("suspended");
    // Suspended first owner reactivated, then a third party cannot remove the last active one.
    await setUserStatus(o.id, "active", asActor(second.user));
    await setUserStatus(second.user.id, "suspended", asActor(o));
    const admin = await makeUser(asActor(o), "admin", "adm@example.com");
    await expect(setUserStatus(o.id, "suspended", asActor(admin.user))).rejects.toMatchObject({ code: "forbidden" });
    // Direct guard: with only one active owner left, suspending them fails even for another owner record.
    await run("UPDATE users SET status = 'active' WHERE id = $1", [second.user.id]);
    await run("UPDATE users SET status = 'suspended' WHERE id = $1", [o.id]);
    await expect(setUserStatus(second.user.id, "suspended", asActor(o))).rejects.toMatchObject({ code: "last_owner" });
    await expect(setUserStatus("00000000-0000-4000-8000-000000000000", "active", asActor(o))).rejects.toMatchObject({ code: "not_found" });
  });

  it("canManage and creatableRoles", () => {
    const ownerA: Actor = { id: "o", role: "owner" };
    const adminA: Actor = { id: "a", role: "admin" };
    const lawyerA: Actor = { id: "l", role: "lawyer" };
    expect(creatableRoles(ownerA)).toEqual(["owner", "admin", "lawyer"]);
    expect(creatableRoles(adminA)).toEqual(["lawyer"]);
    expect(creatableRoles(lawyerA)).toEqual([]);
    expect(canManage(ownerA, { id: "x", role: "owner" })).toBe(true);
    expect(canManage(ownerA, { id: "x", role: "admin" })).toBe(true);
    expect(canManage(adminA, { id: "x", role: "lawyer" })).toBe(true);
    expect(canManage(adminA, { id: "x", role: "admin" })).toBe(false);
    expect(canManage(adminA, { id: "x", role: "owner" })).toBe(false);
    expect(canManage(lawyerA, { id: "x", role: "lawyer" })).toBe(false);
  });

  it("admins manage lawyers only", async () => {
    const o = asActor(await owner());
    const admin = await makeUser(o, "admin", "adm@example.com");
    const other = await makeUser(o, "admin", "adm2@example.com");
    const lawyer = await makeUser(o, "lawyer", "law@example.com");
    const a = asActor(admin.user);
    await expect(setUserStatus(other.user.id, "suspended", a)).rejects.toMatchObject({ code: "forbidden" });
    await expect(issueSetupLink(other.user.id, a)).rejects.toMatchObject({ code: "forbidden" });
    await expect(revokeAllSessions(other.user.id, a)).rejects.toMatchObject({ code: "forbidden" });
    expect((await setUserStatus(lawyer.user.id, "suspended", a)).status).toBe("suspended");
    // Suspended users get no setup link (it would reactivate them).
    await expect(issueSetupLink(lawyer.user.id, a)).rejects.toMatchObject({ code: "invalid" });
  });

  it("writes the audit log for every mutation, newest first, with actor emails", async () => {
    const o = await owner();
    const { user, setupPath } = await createUser({ email: "aud@example.com", name: "Aud", role: "lawyer", country: "IN" }, asActor(o));
    await issueSetupLink(user.id, asActor(o));
    await completeSetup(tokenOf((await issueSetupLink(user.id, asActor(o))).setupPath), "a long password 1");
    expect(setupPath).toBeTruthy();
    await setUserStatus(user.id, "suspended", asActor(o));
    await setUserStatus(user.id, "active", asActor(o));
    await recordAudit({ actor_user_id: o.id, action: "application.note", target_type: "application", target_id: "app-1", details: { n: 1 } });

    const all = await listAudit();
    expect(all.map((a) => a.action).slice(0, 7)).toEqual([
      "application.note",
      "user.reactivate",
      "user.suspend",
      "user.setup_complete",
      "user.setup_link",
      "user.setup_link",
      "user.create",
    ]);
    expect(all[0]).toMatchObject({ actor_email: "owner@example.com", details: { n: 1 }, target_type: "application" });
    expect(all.find((a) => a.action === "user.create")?.details).toEqual({ role: "lawyer", country: "IN" });
    expect(all.find((a) => a.action === "user.setup_complete")?.actor_email).toBe("aud@example.com");
    const forUser = await listAudit({ targetId: user.id, limit: 2 });
    expect(forUser.map((a) => a.action)).toEqual(["user.reactivate", "user.suspend"]);
    // No passwords or tokens in the log.
    expect(JSON.stringify(all)).not.toMatch(/password 1|token=/);
  });
});
