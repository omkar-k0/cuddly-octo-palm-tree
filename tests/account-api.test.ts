import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/accounts", () => {
  class AccountError extends Error {
    constructor(public code: string) {
      super(code);
    }
  }
  return {
    AccountError,
    SESSION_COOKIE: "ds_session",
    SESSION_TTL_SECONDS: 43200,
    completeSetup: vi.fn(),
    changePassword: vi.fn(),
    revokeAllSessions: vi.fn(),
  };
});
vi.mock("@/lib/accounts/session", () => ({ userFromRequest: vi.fn() }));

import * as accounts from "@/lib/accounts";
import { userFromRequest } from "@/lib/accounts/session";
import { POST as setupRoute } from "@/app/api/account/setup/route";
import { POST as passwordRoute } from "@/app/api/account/password/route";
import { POST as revokeRoute } from "@/app/api/account/sessions/revoke/route";

const A = vi.mocked(accounts);
const session = vi.mocked(userFromRequest);

const ORIGIN = "https://dem-fragen.test";
const me = { id: "33333333-3333-4333-8333-333333333333", email: "me@x.test", name: "Me", role: "lawyer", status: "active", country: "IN", created_at: "", last_login_at: null, session_id: "s9" } as const;
const GOOD = "correct horse battery staple";

function post(path: string, body?: unknown, headers: Record<string, string> = { "sec-fetch-site": "same-origin" }) {
  return new Request(`${ORIGIN}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
}
const err = (code: string) => new (accounts.AccountError as unknown as new (c: string) => Error)(code);
const env = process.env as Record<string, string | undefined>;
const originalEnv = env.NODE_ENV;

beforeEach(() => {
  vi.clearAllMocks();
  session.mockResolvedValue(me as never);
});
afterEach(() => {
  env.NODE_ENV = originalEnv;
});

describe("POST /api/account/setup (open route)", () => {
  const ok = { ok: true as const, token: "rawSessionToken123", user: { ...me } as never };

  it("sets the session cookie with the required attributes (development)", async () => {
    env.NODE_ENV = "development";
    A.completeSetup.mockResolvedValue(ok);
    const res = await setupRoute(post("/api/account/setup", { token: "setup-token", password: GOOD }));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("set-cookie")).toBe("ds_session=rawSessionToken123; Path=/; Max-Age=43200; HttpOnly; SameSite=Strict");
    expect(A.completeSetup).toHaveBeenCalledWith("setup-token", GOOD);
    expect(session).not.toHaveBeenCalled(); // open route: no session needed
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(JSON.stringify(body)).not.toContain("rawSessionToken123"); // the token only travels in the cookie
  });

  it("adds Secure in production", async () => {
    env.NODE_ENV = "production";
    A.completeSetup.mockResolvedValue(ok);
    const res = await setupRoute(post("/api/account/setup", { token: "t", password: GOOD }));
    expect(res.headers.get("set-cookie")).toBe("ds_session=rawSessionToken123; Path=/; Max-Age=43200; HttpOnly; SameSite=Strict; Secure");
  });

  it("returns 403 cross-origin and never calls the service", async () => {
    const res = await setupRoute(post("/api/account/setup", { token: "t", password: GOOD }, { "sec-fetch-site": "cross-site" }));
    expect(res.status).toBe(403);
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(A.completeSetup).not.toHaveBeenCalled();
  });

  it.each([
    ["not json", "{"],
    ["no token", { password: GOOD }],
    ["empty token", { token: "", password: GOOD }],
    ["no password", { token: "t" }],
    ["non-string password", { token: "t", password: 12345678901234 }],
    ["huge password", { token: "t", password: "x".repeat(501) }],
  ])("returns 400 for %s", async (_l, body) => {
    const res = await setupRoute(post("/api/account/setup", body as never));
    expect(res.status).toBe(400);
    expect(A.completeSetup).not.toHaveBeenCalled();
  });

  it("returns weak_password for a short password without calling the service", async () => {
    const res = await setupRoute(post("/api/account/setup", { token: "t", password: "short" }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("weak_password");
    expect(A.completeSetup).not.toHaveBeenCalled();
  });

  it.each([
    ["invalid_token", 400, "invalid_token"],
    ["expired_token", 400, "expired_token"],
    ["weak_password", 400, "weak_password"],
    ["unavailable", 503, "unavailable"],
  ] as const)("maps the %s result to %i without a cookie", async (error, status, code) => {
    A.completeSetup.mockResolvedValue({ ok: false, error });
    const res = await setupRoute(post("/api/account/setup", { token: "t", password: GOOD }));
    expect(res.status).toBe(status);
    expect((await res.json()).code).toBe(code);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("uses one friendly message for invalid and expired links", async () => {
    A.completeSetup.mockResolvedValue({ ok: false, error: "expired_token" });
    const res = await setupRoute(post("/api/account/setup", { token: "t", password: GOOD }));
    expect((await res.json()).error).toBe("This link is invalid or has expired. Ask your team for a new one.");
  });

  it("maps a thrown AccountError and logs neither password nor token", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    A.completeSetup.mockRejectedValue(err("invalid"));
    expect((await setupRoute(post("/api/account/setup", { token: "t", password: GOOD }))).status).toBe(400);
    A.completeSetup.mockRejectedValue(new Error(`boom ${GOOD} setup-token-xyz`));
    const res = await setupRoute(post("/api/account/setup", { token: "setup-token-xyz", password: GOOD }));
    expect(res.status).toBe(500);
    const logged = JSON.stringify(spy.mock.calls);
    expect(logged).not.toContain(GOOD);
    expect(logged).not.toContain("setup-token-xyz");
    spy.mockRestore();
  });
});

describe("POST /api/account/password", () => {
  const body = { current: "old password here", next: GOOD };

  it("changes the password for the signed-in user (any role)", async () => {
    A.changePassword.mockResolvedValue({ ok: true });
    const res = await passwordRoute(post("/api/account/password", body));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(A.changePassword).toHaveBeenCalledWith(me.id, "old password here", GOOD);
    expect(session).toHaveBeenCalledWith(expect.any(Request), undefined);
  });

  it("401 without a user, 403 cross-origin", async () => {
    session.mockResolvedValue(null);
    expect((await passwordRoute(post("/api/account/password", body))).status).toBe(401);
    session.mockResolvedValue(me as never);
    expect((await passwordRoute(post("/api/account/password", body, { "sec-fetch-site": "cross-site" }))).status).toBe(403);
    expect(A.changePassword).not.toHaveBeenCalled();
  });

  it("returns 400 for a missing current password, bad body, or a short new password", async () => {
    for (const b of [{ next: GOOD }, { current: "", next: GOOD }, "{", { current: "x" }]) {
      expect((await passwordRoute(post("/api/account/password", b as never))).status).toBe(400);
    }
    const weak = await passwordRoute(post("/api/account/password", { current: "x", next: "short" }));
    expect(weak.status).toBe(400);
    expect((await weak.json()).code).toBe("weak_password");
    expect(A.changePassword).not.toHaveBeenCalled();
  });

  it("maps service results", async () => {
    A.changePassword.mockResolvedValue({ ok: false, error: "invalid_current" });
    const wrong = await passwordRoute(post("/api/account/password", body));
    expect(wrong.status).toBe(400);
    expect((await wrong.json()).code).toBe("invalid_current");

    A.changePassword.mockResolvedValue({ ok: false, error: "weak_password" });
    const weak = await passwordRoute(post("/api/account/password", body));
    expect(weak.status).toBe(400);
    expect((await weak.json()).code).toBe("weak_password");
  });

  it("maps a thrown AccountError", async () => {
    A.changePassword.mockRejectedValue(err("not_found"));
    expect((await passwordRoute(post("/api/account/password", body))).status).toBe(404);
  });
});

describe("POST /api/account/sessions/revoke", () => {
  it("revokes the user's own sessions and clears the cookie", async () => {
    env.NODE_ENV = "development";
    A.revokeAllSessions.mockResolvedValue();
    const res = await revokeRoute(post("/api/account/sessions/revoke"));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(A.revokeAllSessions).toHaveBeenCalledWith(me.id, { id: me.id, role: "lawyer" });
    expect(res.headers.get("set-cookie")).toBe("ds_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict");
  });

  it("marks the clearing cookie Secure in production", async () => {
    env.NODE_ENV = "production";
    const res = await revokeRoute(post("/api/account/sessions/revoke"));
    expect(res.headers.get("set-cookie")).toBe("ds_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict; Secure");
  });

  it("401 without a user, 403 cross-origin; no revoke and no cookie change", async () => {
    session.mockResolvedValue(null);
    const unauth = await revokeRoute(post("/api/account/sessions/revoke"));
    expect(unauth.status).toBe(401);
    expect(unauth.headers.get("set-cookie")).toBeNull();
    session.mockResolvedValue(me as never);
    const cross = await revokeRoute(post("/api/account/sessions/revoke", undefined, { origin: "https://evil.test", "sec-fetch-site": "cross-site" }));
    expect(cross.status).toBe(403);
    expect(A.revokeAllSessions).not.toHaveBeenCalled();
  });

  it("does not clear the cookie when revoking fails", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    A.revokeAllSessions.mockRejectedValue(new Error("db down"));
    const res = await revokeRoute(post("/api/account/sessions/revoke"));
    expect(res.status).toBe(500);
    expect(res.headers.get("set-cookie")).toBeNull();
    spy.mockRestore();
  });
});
