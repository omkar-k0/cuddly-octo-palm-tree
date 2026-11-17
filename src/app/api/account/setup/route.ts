import { z } from "zod";
import { completeSetup } from "@/lib/accounts";
import {
  checkOrigin,
  errorResponse,
  fail,
  json,
  MAX_PASSWORD,
  MIN_PASSWORD,
  readBody,
  sessionCookie,
  weakPassword,
} from "../../team/_http";

const Body = z.object({ token: z.string().min(1).max(500), password: z.string().max(MAX_PASSWORD) });

/**
 * Open route (the person has no session yet): consume a setup token, set the
 * password and start a session. The token and password are never logged.
 */
export async function POST(request: Request) {
  const bad = checkOrigin(request);
  if (bad) return bad;
  const body = await readBody(request, Body);
  if (body.response) return body.response;
  const { token, password } = body.data;
  if (password.length < MIN_PASSWORD) return weakPassword();

  try {
    const result = await completeSetup(token, password);
    if (!result.ok) {
      switch (result.error) {
        case "invalid_token":
          return fail(400, "This link is invalid or has expired. Ask your team for a new one.", "invalid_token");
        case "expired_token":
          return fail(400, "This link is invalid or has expired. Ask your team for a new one.", "expired_token");
        case "weak_password":
          return weakPassword();
        default:
          return fail(503, "Accounts are not available right now. Try again shortly.", "unavailable");
      }
    }
    const res = json({ ok: true, user: result.user });
    res.headers.append("Set-Cookie", sessionCookie(result.token));
    return res;
  } catch (e) {
    return errorResponse(e);
  }
}
