import { z } from "zod";
import { accountsAvailable, SESSION_COOKIE, SESSION_TTL_SECONDS, signIn } from "@/lib/accounts";
import { sameOrigin, sessionCookie } from "@/lib/admin/auth";

const Body = z.object({ email: z.string().max(200), password: z.string().max(500) });
const NO_STORE = { "Cache-Control": "no-store" };
const fail = (status: number, error: string) => Response.json({ error }, { status, headers: NO_STORE });

const UNAVAILABLE = "Sign-in is unavailable: no accounts database is configured or reachable (DATABASE_URL).";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail(403, "Bad origin.");
  if (!(await accountsAvailable())) return fail(503, UNAVAILABLE);

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, "Enter your email and password.");

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const result = await signIn(parsed.data.email, parsed.data.password, { ip });
  if (!result.ok) {
    switch (result.error) {
      case "throttled":
        return fail(429, "Too many attempts. Try again in 15 minutes.");
      case "suspended":
        return fail(403, "This account is suspended. Ask the site owner.");
      case "unavailable":
        return fail(503, UNAVAILABLE);
      default:
        return fail(401, "Email or password is incorrect.");
    }
  }

  const res = Response.json({ ok: true }, { headers: NO_STORE });
  res.headers.append("Set-Cookie", sessionCookie(SESSION_COOKIE, result.token, SESSION_TTL_SECONDS));
  return res;
}
