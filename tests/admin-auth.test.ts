import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  authenticate,
  createSessionToken,
  hashPassword,
  noteFailure,
  parseAdminUsers,
  sameOrigin,
  throttled,
  verifyPassword,
  verifySessionToken,
} from "@/lib/admin/auth";

const PW = "correct horse battery staple";
let hash: string;

beforeEach(() => {
  hash ??= hashPassword(PW);
  process.env.ADMIN_SESSION_SECRET = "x".repeat(40);
  process.env.ADMIN_USERS = `Lawyer@Example.com:${hash}`;
});
afterEach(() => {
  delete process.env.ADMIN_SESSION_SECRET;
  delete process.env.ADMIN_USERS;
});

describe("passwords", () => {
  it("verifies the right password only", () => {
    expect(verifyPassword(PW, hash)).toBe(true);
    expect(verifyPassword("wrong", hash)).toBe(false);
    expect(verifyPassword(PW, "garbage")).toBe(false);
  });
  it("salts every hash", () => {
    expect(hashPassword(PW)).not.toBe(hash);
  });
  it("parses ADMIN_USERS and normalises emails", () => {
    const users = parseAdminUsers(`a@x.com:${hash}, bad-entry ,B@X.com:${hash}`);
    expect([...users.keys()]).toEqual(["a@x.com", "b@x.com"]);
  });
  it("authenticates case-insensitively and rejects unknown users", () => {
    expect(authenticate("lawyer@example.com", PW)).toBe("lawyer@example.com");
    expect(authenticate("lawyer@example.com", "nope")).toBeNull();
    expect(authenticate("someone@else.com", PW)).toBeNull();
  });
});

describe("sessions", () => {
  it("round-trips a valid token", () => {
    const t = createSessionToken("lawyer@example.com");
    expect(verifySessionToken(t)?.email).toBe("lawyer@example.com");
  });
  it("rejects tampered, expired and orphaned tokens", () => {
    const t = createSessionToken("lawyer@example.com");
    const [payload, mac] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ email: "lawyer@example.com", exp: 9e9 })).toString("base64url");
    expect(verifySessionToken(`${forged}.${mac}`)).toBeNull();
    expect(verifySessionToken(`${payload}.${mac.slice(0, -2)}xx`)).toBeNull();
    expect(verifySessionToken(t, Date.now() + 13 * 3600 * 1000)).toBeNull();
    process.env.ADMIN_USERS = "";
    expect(verifySessionToken(t)).toBeNull();
  });
  it("is disabled without a strong secret", () => {
    const t = createSessionToken("lawyer@example.com");
    process.env.ADMIN_SESSION_SECRET = "short";
    expect(verifySessionToken(t)).toBeNull();
  });
});

describe("request guards", () => {
  it("checks the origin", () => {
    const ok = new Request("https://site.test/api/admin/verify", { method: "POST", headers: { origin: "https://site.test" } });
    const bad = new Request("https://site.test/api/admin/verify", { method: "POST", headers: { origin: "https://evil.test" } });
    const none = new Request("https://site.test/api/admin/verify", { method: "POST" });
    expect([sameOrigin(ok), sameOrigin(bad), sameOrigin(none)]).toEqual([true, false, false]);
    const browserSame = new Request("https://site.test/x", { method: "POST", headers: { origin: "null", "sec-fetch-site": "same-origin" } });
    const browserCross = new Request("https://site.test/x", { method: "POST", headers: { origin: "https://site.test", "sec-fetch-site": "cross-site" } });
    expect([sameOrigin(browserSame), sameOrigin(browserCross)]).toEqual([true, false]);
  });
  it("throttles after five failures", () => {
    for (let i = 0; i < 5; i++) noteFailure("1.2.3.4");
    expect(throttled("1.2.3.4")).toBe(true);
    expect(throttled("5.6.7.8")).toBe(false);
  });
});
