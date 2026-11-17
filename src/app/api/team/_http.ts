/**
 * Shared helpers for the team and account API routes: JSON responses,
 * the same-origin and sign-in checks, body validation, and the mapping of
 * AccountError codes to HTTP statuses.
 *
 * Nothing here logs request bodies, passwords or tokens.
 */
import { z } from "zod";
import { AccountError, SESSION_COOKIE, SESSION_TTL_SECONDS, type Actor, type Role, type SessionUser } from "@/lib/accounts";
import { userFromRequest } from "@/lib/accounts/session";
import { sameOrigin } from "@/lib/admin/auth";

export const NO_STORE = { "Cache-Control": "no-store" };

export const TEAM_ROLES: Role[] = ["owner", "admin"];

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

export function fail(status: number, error: string, code: string, extra?: Record<string, unknown>): Response {
  return json({ error, code, ...extra }, status);
}

/** 403 for requests that do not come from our own pages. */
export function checkOrigin(request: Request): Response | null {
  return sameOrigin(request) ? null : fail(403, "Bad origin.", "forbidden");
}

export type Authorized = { user: SessionUser; response?: undefined } | { user?: undefined; response: Response };

/**
 * Same-origin check, then the signed-in user (optionally restricted to roles).
 * 403 cross-origin, 401 when nobody is signed in, 403 when the role is not allowed.
 */
export async function authorize(request: Request, roles?: Role[]): Promise<Authorized> {
  const bad = checkOrigin(request);
  if (bad) return { response: bad };

  const user = await userFromRequest(request, roles);
  if (!user) {
    // A signed-in user with the wrong role is forbidden, not unauthenticated.
    if (roles && (await userFromRequest(request))) {
      return { response: fail(403, "You do not have permission to do this.", "forbidden") };
    }
    return { response: fail(401, "Not signed in.", "unauthorized") };
  }
  if (roles && !roles.includes(user.role)) {
    return { response: fail(403, "You do not have permission to do this.", "forbidden") };
  }
  return { user };
}

export type Parsed<T> = { data: T; response?: undefined } | { data?: undefined; response: Response };

/** Read and validate a JSON body. 400 with code "invalid" on any problem. */
export async function readBody<S extends z.ZodType>(request: Request, schema: S): Promise<Parsed<z.output<S>>> {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((i) => i.path.join(".")).filter(Boolean))];
    return { response: fail(400, "Check the details and try again.", "invalid", { fields }) };
  }
  return { data: parsed.data };
}

/** User ids are uuids; anything else cannot exist. */
const UserId = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

/** Resolve the `[id]` route param. Returns null for a malformed id (treat as 404). */
export async function userIdParam(ctx: { params: Promise<{ id: string }> }): Promise<string | null> {
  const parsed = UserId.safeParse((await ctx.params).id);
  return parsed.success ? parsed.data : null;
}

const STATUS = { forbidden: 403, email_taken: 409, invalid: 400, last_owner: 409, not_found: 404 } as const;
const MESSAGE = {
  forbidden: "You do not have permission to do this.",
  email_taken: "Someone with that email already has an account.",
  invalid: "Check the details and try again.",
  last_owner: "There must always be at least one active owner.",
  not_found: "That account does not exist.",
} as const;

/** Turn a thrown error into a response. Unknown errors are logged by name only. */
export function errorResponse(e: unknown): Response {
  if (e instanceof AccountError) return fail(STATUS[e.code], MESSAGE[e.code], e.code);
  console.error("accounts api error:", e instanceof Error ? e.name : "unknown");
  return fail(500, "Something went wrong. Try again.", "server_error");
}

export const notFound = () => fail(404, MESSAGE.not_found, "not_found");

/** Absolute URL for a path such as "/account/setup?token=…", from the request's own origin. */
export function absoluteUrl(request: Request, path: string): string {
  return `${new URL(request.url).origin}${path}`;
}

const secure = () => (process.env.NODE_ENV === "production" ? "; Secure" : "");

/** Set-Cookie value that starts a session. */
export function sessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${SESSION_TTL_SECONDS}; HttpOnly; SameSite=Strict${secure()}`;
}

/** Set-Cookie value that ends the session in the browser. */
export function clearedSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict${secure()}`;
}

export const actorOf = (u: SessionUser): Actor => ({ id: u.id, role: u.role });

/** Minimum password length, enforced here and again by the accounts service. */
export const MIN_PASSWORD = 12;
export const MAX_PASSWORD = 500;
export const weakPassword = () =>
  fail(400, `Use at least ${MIN_PASSWORD} characters.`, "weak_password");
