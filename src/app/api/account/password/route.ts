import { z } from "zod";
import { changePassword } from "@/lib/accounts";
import { authorize, errorResponse, fail, json, MAX_PASSWORD, MIN_PASSWORD, readBody, weakPassword } from "../../team/_http";

const Body = z.object({ current: z.string().min(1).max(MAX_PASSWORD), next: z.string().max(MAX_PASSWORD) });

/** Change your own password. Your other sessions are signed out; this one stays. */
export async function POST(request: Request) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;
  const body = await readBody(request, Body);
  if (body.response) return body.response;
  const { current, next } = body.data;
  if (next.length < MIN_PASSWORD) return weakPassword();

  try {
    const result = await changePassword(auth.user.id, current, next, auth.user.session_id);
    if (!result.ok) {
      return result.error === "invalid_current"
        ? fail(400, "Your current password is not correct.", "invalid_current")
        : weakPassword();
    }
    return json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
