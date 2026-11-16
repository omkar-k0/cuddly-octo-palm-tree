import { z } from "zod";
import {
  adminConfigured,
  authenticate,
  clearFailures,
  createSessionToken,
  noteFailure,
  sameOrigin,
  SESSION_COOKIE,
  sessionCookieOptions,
  throttled,
} from "@/lib/admin/auth";

const Body = z.object({ email: z.string().max(200), password: z.string().max(500) });
const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Bad origin." }, { status: 403, headers: NO_STORE });
  if (!adminConfigured()) {
    return Response.json(
      { error: "The dashboard is not configured. Set ADMIN_USERS and ADMIN_SESSION_SECRET." },
      { status: 503, headers: NO_STORE },
    );
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (throttled(ip)) {
    return Response.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429, headers: NO_STORE });
  }

  const parsed = Body.safeParse(await request.json().catch(() => null));
  const email = parsed.success ? authenticate(parsed.data.email, parsed.data.password) : null;
  if (!email) {
    noteFailure(ip);
    return Response.json({ error: "Email or password is incorrect." }, { status: 401, headers: NO_STORE });
  }

  clearFailures(ip);
  const res = Response.json({ ok: true }, { headers: NO_STORE });
  const opts = sessionCookieOptions();
  res.headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE}=${createSessionToken(email)}; Path=${opts.path}; Max-Age=${opts.maxAge}; HttpOnly; SameSite=Strict${opts.secure ? "; Secure" : ""}`,
  );
  return res;
}
