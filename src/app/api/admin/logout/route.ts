import { SESSION_COOKIE, signOut } from "@/lib/accounts";
import { sessionTokenFromCookieHeader } from "@/lib/accounts/session";
import { sameOrigin, sessionCookie } from "@/lib/admin/auth";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Bad origin." }, { status: 403 });
  const token = sessionTokenFromCookieHeader(request.headers.get("cookie"));
  if (token) {
    try {
      await signOut(token);
    } catch (e) {
      console.error(`[logout] revoke failed: ${(e as Error).name}`);
    }
  }
  const res = Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  res.headers.append("Set-Cookie", sessionCookie(SESSION_COOKIE, "", 0));
  return res;
}
