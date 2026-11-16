import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken, type Session } from "./auth";

/** Current lawyer session, or null. Reads the request: call inside <Suspense>. */
export async function getSession(): Promise<Session | null> {
  return verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
}

/** For admin pages: the session, or a redirect to the login page. */
export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/admin/login");
  return s;
}

/** For admin API routes: the session from the request, or null. */
export function sessionFromRequest(request: Request): Session | null {
  const raw = request.headers.get("cookie") ?? "";
  const m = new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`).exec(raw);
  return verifySessionToken(m ? decodeURIComponent(m[1]) : undefined);
}
