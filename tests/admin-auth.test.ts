import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { hashPassword, noteFailure, parseAdminUsers, sameOrigin, sessionCookie, throttled, verifyPassword } from "@/lib/admin/auth";
import { proxy } from "@/proxy";

const PW = "correct horse battery staple";
const hash = hashPassword(PW);

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
});

describe("session cookie", () => {
  it("is httpOnly and SameSite=Strict, Secure only in production", () => {
    const c = sessionCookie("ds_session", "abc", 43200);
    expect(c).toBe("ds_session=abc; Path=/; Max-Age=43200; HttpOnly; SameSite=Strict");
    const env = process.env as Record<string, string | undefined>;
    const prev = env.NODE_ENV;
    env.NODE_ENV = "production";
    try {
      expect(sessionCookie("ds_session", "", 0)).toMatch(/Max-Age=0; HttpOnly; SameSite=Strict; Secure$/);
    } finally {
      env.NODE_ENV = prev;
    }
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

describe("proxy gate", () => {
  const TOKEN = "a".repeat(43);
  const req = (path: string, cookie?: string) =>
    new NextRequest(`https://site.test${path}`, cookie ? { headers: { cookie: `ds_session=${cookie}` } } : undefined);

  it("redirects pages and rejects APIs without a well-formed cookie", async () => {
    for (const p of ["/admin", "/admin/sources/x", "/team", "/account"]) {
      const res = proxy(req(p));
      expect(res.status, p).toBe(307);
      expect(res.headers.get("location")).toBe("https://site.test/admin/login");
    }
    for (const p of ["/api/admin/verify", "/api/team/users", "/api/account/password"]) {
      const res = proxy(req(p));
      expect(res.status, p).toBe(401);
      expect((await res.json()).error).toBeTruthy();
    }
    expect(proxy(req("/admin", "short")).status).toBe(307);
    expect(proxy(req("/admin", `${"a".repeat(42)}!`)).status).toBe(307);
  });

  it("lets through open paths and well-formed cookies, with no-store and noindex", () => {
    for (const p of ["/admin/login", "/api/admin/login", "/account/setup", "/api/account/setup"]) {
      const res = proxy(req(p));
      expect(res.status, p).toBe(200);
      expect(res.headers.get("cache-control")).toBe("no-store");
      expect(res.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    }
    expect(proxy(req("/team", TOKEN)).status).toBe(200);
    expect(proxy(req("/api/admin/verify", TOKEN)).status).toBe(200);
  });
});
