/**
 * Lawyer accounts for the verification dashboard.
 *
 * - Accounts live in ADMIN_USERS: "email:hash,email:hash". Make a hash with
 *   `npm run admin:hash` (scrypt, salted). Passwords are never stored.
 * - Sessions are a signed cookie (HMAC-SHA256 with ADMIN_SESSION_SECRET),
 *   valid for 12 hours. No database needed for login.
 * - If either variable is missing, the dashboard is disabled.
 *
 * Node runtime only (node:crypto). proxy.ts runs on Node in this Next version.
 */
import crypto from "node:crypto";

export const SESSION_COOKIE = "admin_session";
export const SESSION_TTL_SECONDS = 12 * 60 * 60;

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 32 } as const;
const b64url = (b: Buffer) => b.toString("base64url");

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${b64url(salt)}$${b64url(hash)}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, salt, hash] = parts;
  const expected = Buffer.from(hash, "base64url");
  let actual: Buffer;
  try {
    actual = crypto.scryptSync(password, Buffer.from(salt, "base64url"), expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: 64 * 1024 * 1024,
    });
  } catch {
    return false;
  }
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

/** Parse ADMIN_USERS. Emails are compared lower-case. */
export function parseAdminUsers(raw: string | undefined): Map<string, string> {
  const users = new Map<string, string>();
  for (const entry of (raw ?? "").split(",")) {
    const i = entry.indexOf(":");
    if (i <= 0) continue;
    const email = entry.slice(0, i).trim().toLowerCase();
    const hash = entry.slice(i + 1).trim();
    if (email && hash.startsWith("scrypt$")) users.set(email, hash);
  }
  return users;
}

function secret(): Buffer | null {
  const s = process.env.ADMIN_SESSION_SECRET;
  return s && s.length >= 32 ? Buffer.from(s) : null;
}

export function adminConfigured(): boolean {
  return !!secret() && parseAdminUsers(process.env.ADMIN_USERS).size > 0;
}

let dummyHash: string | undefined;

/** Check an email and password against ADMIN_USERS. Returns the normalised email or null. */
export function authenticate(email: string, password: string): string | null {
  const users = parseAdminUsers(process.env.ADMIN_USERS);
  const key = email.trim().toLowerCase();
  const stored = users.get(key);
  // Unknown emails still pay for one scrypt, so timing does not reveal accounts.
  dummyHash ??= hashPassword(crypto.randomBytes(16).toString("hex"));
  const ok = verifyPassword(password, stored ?? dummyHash);
  return ok && stored ? key : null;
}

export interface Session {
  email: string;
  exp: number; // unix seconds
}

function sign(payload: string, key: Buffer) {
  return b64url(crypto.createHmac("sha256", key).update(payload).digest());
}

export function createSessionToken(email: string, now = Date.now()): string {
  const key = secret();
  if (!key) throw new Error("ADMIN_SESSION_SECRET is not set (min 32 characters)");
  const payload = b64url(Buffer.from(JSON.stringify({ email, exp: Math.floor(now / 1000) + SESSION_TTL_SECONDS })));
  return `${payload}.${sign(payload, key)}`;
}

export function verifySessionToken(token: string | undefined, now = Date.now()): Session | null {
  const key = secret();
  if (!key || !token) return null;
  const [payload, mac] = token.split(".");
  if (!payload || !mac) return null;
  const expected = Buffer.from(sign(payload, key));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, "base64url").toString()) as Session;
    if (typeof s.email !== "string" || typeof s.exp !== "number" || s.exp * 1000 < now) return null;
    // The account must still exist: removing someone from ADMIN_USERS ends their session.
    if (!parseAdminUsers(process.env.ADMIN_USERS).has(s.email)) return null;
    return s;
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

/** Same-origin check for state-changing admin requests. */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

/** Best-effort login throttle (per server instance): 5 failures per 15 minutes per key. */
const attempts = new Map<string, { count: number; until: number }>();
export function throttled(key: string, now = Date.now()): boolean {
  const a = attempts.get(key);
  return !!a && a.count >= 5 && a.until > now;
}
export function noteFailure(key: string, now = Date.now()) {
  const a = attempts.get(key);
  if (!a || a.until < now) attempts.set(key, { count: 1, until: now + 15 * 60 * 1000 });
  else a.count++;
}
export function clearFailures(key: string) {
  attempts.delete(key);
}
