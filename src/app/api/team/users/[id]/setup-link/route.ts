import { canManage, getUser, issueSetupLink } from "@/lib/accounts";
import {
  absoluteUrl,
  actorOf,
  authorize,
  errorResponse,
  fail,
  json,
  notFound,
  TEAM_ROLES,
  userIdParam,
} from "../../../_http";

/** Issue a new one-time setup link (re-invite or password reset). Older links stop working. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await authorize(request, TEAM_ROLES);
  if (auth.response) return auth.response;
  const id = await userIdParam(ctx);
  if (!id) return notFound();

  try {
    const target = await getUser(id);
    if (!target) return notFound();
    const actor = actorOf(auth.user);
    if (!canManage(actor, target)) return fail(403, "You do not have permission to do this.", "forbidden");
    const { setupPath } = await issueSetupLink(id, actor);
    return json({ setupUrl: absoluteUrl(request, setupPath) });
  } catch (e) {
    return errorResponse(e);
  }
}
