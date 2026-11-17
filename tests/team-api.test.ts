import { beforeEach, describe, expect, it, vi } from "vitest";

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
    createUser: vi.fn(),
    issueSetupLink: vi.fn(),
    setUserStatus: vi.fn(),
    revokeAllSessions: vi.fn(),
    getUser: vi.fn(),
    canManage: vi.fn(),
  };
});
vi.mock("@/lib/accounts/session", () => ({ userFromRequest: vi.fn() }));

import * as accounts from "@/lib/accounts";
import { userFromRequest } from "@/lib/accounts/session";
import { POST as createUserRoute } from "@/app/api/team/users/route";
import { POST as statusRoute } from "@/app/api/team/users/[id]/status/route";
import { POST as setupLinkRoute } from "@/app/api/team/users/[id]/setup-link/route";
import { POST as revokeRoute } from "@/app/api/team/users/[id]/sessions/revoke/route";

const A = vi.mocked(accounts);
const session = vi.mocked(userFromRequest);

const ORIGIN = "https://dem-fragen.test";
const ID = "5b1c7a2e-8d3f-4c6a-9e10-2f4a6b8c0d1e";
const owner = { id: "11111111-1111-4111-8111-111111111111", email: "owner@x.test", name: "Owner", role: "owner", status: "active", country: null, created_at: "", last_login_at: null, session_id: "s1" } as const;
const lawyer = { ...owner, id: "22222222-2222-4222-8222-222222222222", role: "lawyer", country: "IN" } as const;
const created = { id: ID, email: "new@x.test", name: "New Person", role: "lawyer", status: "invited", country: "IN", created_at: "", last_login_at: null } as const;

function post(path: string, body?: unknown, headers: Record<string, string> = { "sec-fetch-site": "same-origin" }) {
  return new Request(`${ORIGIN}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
}
const ctx = (id: string = ID) => ({ params: Promise.resolve({ id }) });
const err = (code: string) => new (accounts.AccountError as unknown as new (c: string) => Error)(code);

/** Sign in as `user`; like the real helper, return null when the role is not allowed. */
function signInAs(user: typeof owner | typeof lawyer | null) {
  session.mockImplementation(async (_req: Request, roles?: readonly string[]) => {
    if (!user) return null;
    return roles && !roles.includes(user.role) ? null : (user as never);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  signInAs(owner);
  A.canManage.mockReturnValue(true);
  A.getUser.mockResolvedValue(created as never);
});

const validCreate = { name: "New Person", email: "new@x.test", role: "lawyer", country: "IN" };

describe("POST /api/team/users", () => {
  it("creates a user and builds setupUrl from the request origin", async () => {
    A.createUser.mockResolvedValue({ user: created as never, setupPath: "/account/setup?token=abc123" });
    const res = await createUserRoute(post("/api/team/users", validCreate));
    expect(res.status).toBe(201);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ user: created, setupUrl: `${ORIGIN}/account/setup?token=abc123` });
    expect(A.createUser).toHaveBeenCalledWith(
      { name: "New Person", email: "new@x.test", role: "lawyer", country: "IN" },
      { id: owner.id, role: "owner" },
    );
  });

  it("normalises the email and drops the country for non-lawyers", async () => {
    A.createUser.mockResolvedValue({ user: created as never, setupPath: "/account/setup?token=t" });
    await createUserRoute(post("/api/team/users", { name: "  Ada  ", email: " Ada@X.TEST ", role: "admin", country: "DE" }));
    expect(A.createUser).toHaveBeenCalledWith({ name: "Ada", email: "ada@x.test", role: "admin", country: null }, expect.anything());
  });

  it("returns 401 without a user", async () => {
    signInAs(null);
    const res = await createUserRoute(post("/api/team/users", validCreate));
    expect(res.status).toBe(401);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(A.createUser).not.toHaveBeenCalled();
  });

  it("returns 403 for a cross-origin request, before looking at the session", async () => {
    const res = await createUserRoute(post("/api/team/users", validCreate, { "sec-fetch-site": "cross-site" }));
    expect(res.status).toBe(403);
    expect(session).not.toHaveBeenCalled();
    expect(A.createUser).not.toHaveBeenCalled();
  });

  it("returns 403 without any origin signal", async () => {
    const res = await createUserRoute(post("/api/team/users", validCreate, {}));
    expect(res.status).toBe(403);
  });

  it("rejects a lawyer with 403 and asks for the owner/admin roles", async () => {
    signInAs(lawyer);
    const res = await createUserRoute(post("/api/team/users", validCreate));
    expect(res.status).toBe(403);
    expect(session).toHaveBeenCalledWith(expect.any(Request), ["owner", "admin"]);
    expect(A.createUser).not.toHaveBeenCalled();
  });

  it("rejects a lawyer even if the session helper ignores the role filter", async () => {
    session.mockResolvedValue(lawyer as never);
    const res = await createUserRoute(post("/api/team/users", validCreate));
    expect(res.status).toBe(403);
    expect(A.createUser).not.toHaveBeenCalled();
  });

  it.each([
    ["not json", "{nope"],
    ["empty body", ""],
    ["missing name", { ...validCreate, name: "  " }],
    ["bad email", { ...validCreate, email: "not-an-email" }],
    ["unknown role", { ...validCreate, role: "superuser" }],
    ["lawyer without country", { name: "L", email: "l@x.test", role: "lawyer" }],
    ["unknown country", { ...validCreate, country: "FR" }],
  ])("returns 400 for %s", async (_label, body) => {
    const res = await createUserRoute(post("/api/team/users", body as never));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("invalid");
    expect(A.createUser).not.toHaveBeenCalled();
  });

  it.each([
    ["forbidden", 403],
    ["email_taken", 409],
    ["invalid", 400],
    ["last_owner", 409],
    ["not_found", 404],
  ])("maps AccountError %s to %i", async (code, status) => {
    A.createUser.mockRejectedValue(err(code));
    const res = await createUserRoute(post("/api/team/users", validCreate));
    expect(res.status).toBe(status);
    expect((await res.json()).code).toBe(code);
  });

  it("returns a generic 500 for unexpected errors without leaking the message", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    A.createUser.mockRejectedValue(new Error("connection string postgres://secret"));
    const res = await createUserRoute(post("/api/team/users", validCreate));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("secret");
    expect(JSON.stringify(spy.mock.calls)).not.toContain("secret");
    spy.mockRestore();
  });
});

describe("POST /api/team/users/[id]/status", () => {
  it("suspends and reactivates", async () => {
    A.setUserStatus.mockResolvedValue({ ...created, status: "suspended" } as never);
    const res = await statusRoute(post(`/api/team/users/${ID}/status`, { status: "suspended" }), ctx());
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect((await res.json()).user.status).toBe("suspended");
    expect(A.setUserStatus).toHaveBeenCalledWith(ID, "suspended", { id: owner.id, role: "owner" });

    await statusRoute(post(`/api/team/users/${ID}/status`, { status: "active" }), ctx());
    expect(A.setUserStatus).toHaveBeenLastCalledWith(ID, "active", expect.anything());
  });

  it("401 without a user, 403 cross-origin, 403 for lawyers", async () => {
    signInAs(null);
    expect((await statusRoute(post(`/api/team/users/${ID}/status`, { status: "active" }), ctx())).status).toBe(401);
    signInAs(owner);
    expect((await statusRoute(post(`/api/team/users/${ID}/status`, { status: "active" }, { origin: "https://evil.test" }), ctx())).status).toBe(403);
    signInAs(lawyer);
    expect((await statusRoute(post(`/api/team/users/${ID}/status`, { status: "active" }), ctx())).status).toBe(403);
    expect(A.setUserStatus).not.toHaveBeenCalled();
  });

  it("validates the status, including the invited value", async () => {
    for (const body of [{ status: "invited" }, { status: "deleted" }, {}, "x"]) {
      const res = await statusRoute(post(`/api/team/users/${ID}/status`, body), ctx());
      expect(res.status).toBe(400);
    }
    expect(A.setUserStatus).not.toHaveBeenCalled();
  });

  it("returns 404 for a malformed id", async () => {
    const res = await statusRoute(post("/api/team/users/nope/status", { status: "active" }), ctx("nope"));
    expect(res.status).toBe(404);
    expect(A.setUserStatus).not.toHaveBeenCalled();
  });

  it.each([
    ["forbidden", 403],
    ["last_owner", 409],
    ["not_found", 404],
  ])("maps AccountError %s to %i", async (code, status) => {
    A.setUserStatus.mockRejectedValue(err(code));
    const res = await statusRoute(post(`/api/team/users/${ID}/status`, { status: "suspended" }), ctx());
    expect(res.status).toBe(status);
  });
});

describe("POST /api/team/users/[id]/setup-link", () => {
  it("returns a setupUrl built from the request origin", async () => {
    A.issueSetupLink.mockResolvedValue({ setupPath: "/account/setup?token=zzz" });
    const res = await setupLinkRoute(post(`/api/team/users/${ID}/setup-link`), ctx());
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ setupUrl: `${ORIGIN}/account/setup?token=zzz` });
    expect(A.issueSetupLink).toHaveBeenCalledWith(ID, { id: owner.id, role: "owner" });
  });

  it("uses the origin the request came in on", async () => {
    A.issueSetupLink.mockResolvedValue({ setupPath: "/account/setup?token=zzz" });
    const req = new Request("http://localhost:3202/api/team/users/" + ID + "/setup-link", {
      method: "POST",
      headers: { "sec-fetch-site": "same-origin" },
    });
    expect((await (await setupLinkRoute(req, ctx())).json()).setupUrl).toBe("http://localhost:3202/account/setup?token=zzz");
  });

  it("401, 403 cross-origin, 403 for lawyers", async () => {
    signInAs(null);
    expect((await setupLinkRoute(post(`/api/team/users/${ID}/setup-link`), ctx())).status).toBe(401);
    signInAs(owner);
    expect((await setupLinkRoute(post(`/api/team/users/${ID}/setup-link`, undefined, {}), ctx())).status).toBe(403);
    signInAs(lawyer);
    expect((await setupLinkRoute(post(`/api/team/users/${ID}/setup-link`), ctx())).status).toBe(403);
    expect(A.issueSetupLink).not.toHaveBeenCalled();
  });

  it("404 for an unknown user, 403 when the actor cannot manage the target", async () => {
    A.getUser.mockResolvedValue(null);
    expect((await setupLinkRoute(post(`/api/team/users/${ID}/setup-link`), ctx())).status).toBe(404);
    A.getUser.mockResolvedValue(created as never);
    A.canManage.mockReturnValue(false);
    expect((await setupLinkRoute(post(`/api/team/users/${ID}/setup-link`), ctx())).status).toBe(403);
    expect(A.issueSetupLink).not.toHaveBeenCalled();
  });

  it("maps AccountError from the service", async () => {
    A.issueSetupLink.mockRejectedValue(err("forbidden"));
    expect((await setupLinkRoute(post(`/api/team/users/${ID}/setup-link`), ctx())).status).toBe(403);
  });
});

describe("POST /api/team/users/[id]/sessions/revoke", () => {
  it("revokes the member's sessions", async () => {
    A.revokeAllSessions.mockResolvedValue();
    const res = await revokeRoute(post(`/api/team/users/${ID}/sessions/revoke`), ctx());
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ ok: true });
    expect(A.revokeAllSessions).toHaveBeenCalledWith(ID, { id: owner.id, role: "owner" });
  });

  it("401, 403 cross-origin, 403 for lawyers", async () => {
    signInAs(null);
    expect((await revokeRoute(post(`/api/team/users/${ID}/sessions/revoke`), ctx())).status).toBe(401);
    signInAs(owner);
    expect((await revokeRoute(post(`/api/team/users/${ID}/sessions/revoke`, undefined, { "sec-fetch-site": "same-site" }), ctx())).status).toBe(403);
    signInAs(lawyer);
    expect((await revokeRoute(post(`/api/team/users/${ID}/sessions/revoke`), ctx())).status).toBe(403);
    expect(A.revokeAllSessions).not.toHaveBeenCalled();
  });

  it("404 for an unknown user, 403 when the actor cannot manage the target", async () => {
    A.getUser.mockResolvedValue(null);
    expect((await revokeRoute(post(`/api/team/users/${ID}/sessions/revoke`), ctx())).status).toBe(404);
    A.getUser.mockResolvedValue(created as never);
    A.canManage.mockReturnValue(false);
    expect((await revokeRoute(post(`/api/team/users/${ID}/sessions/revoke`), ctx())).status).toBe(403);
    expect(A.revokeAllSessions).not.toHaveBeenCalled();
  });
});
