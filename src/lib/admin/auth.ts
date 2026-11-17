/**
 * Password and request helpers shared by the accounts service and the admin
 * routes: scrypt password hashing, ADMIN_USERS parsing (used once, to
 * bootstrap the first owners into the database), the same-origin check and a
 * best-effort in-memory login throttle.
 *
 * Sessions live in the database (see src/lib/accounts). Node runtime only.
 */
import crypto from "node:crypto";

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

/** Set-Cookie value for a session cookie: httpOnly, SameSite=Strict, Secure in production. */
export function sessionCookie(name: string, value: string, maxAgeSeconds: number): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${name}=${value}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly; SameSite=Strict${secure}`;
}

/**
 * Same-origin check for state-changing admin requests.
 *
 * Browsers send Sec-Fetch-Site, which page scripts cannot set; it is the
 * primary signal. Without it, fall back to the Origin header. (Our
 * Referrer-Policy: no-referrer makes browsers send "Origin: null" on
 * same-origin POSTs, so Origin alone would reject real users.)
 */
export function sameOrigin(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site) return site === "same-origin";
  const origin = request.headers.get("origin");
  if (!origin || origin === "null") return false;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

/**
 * Best-effort login throttle (per server instance): `limit` failures per 15
 * minutes per key. The default of 5 is for per-email keys; callers pass a
 * higher limit for shared keys such as an office IP.
 */
const attempts = new Map<string, { count: number; until: number }>();
export function throttled(key: string, now = Date.now(), limit = 5): boolean {
  const a = attempts.get(key);
  return !!a && a.count >= limit && a.until > now;
}
export function noteFailure(key: string, now = Date.now()) {
  const a = attempts.get(key);
  if (!a || a.until < now) attempts.set(key, { count: 1, until: now + 15 * 60 * 1000 });
  else a.count++;
}
export function clearFailures(key: string) {
  attempts.delete(key);
}
/** Tests only: forget every recorded failure. */
export function resetThrottleForTests() {
  attempts.clear();
}
