import { revokeAllSessions } from "@/lib/accounts";
import { actorOf, authorize, clearedSessionCookie, errorResponse, json } from "../../../team/_http";

/** Sign yourself out everywhere, this device included. */
export async function POST(request: Request) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;

  try {
    await revokeAllSessions(auth.user.id, actorOf(auth.user));
    const res = json({ ok: true });
    res.headers.append("Set-Cookie", clearedSessionCookie());
    return res;
  } catch (e) {
    return errorResponse(e);
  }
}
