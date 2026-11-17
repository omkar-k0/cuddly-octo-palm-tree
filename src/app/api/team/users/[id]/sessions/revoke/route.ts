import { canManage, getUser, revokeAllSessions } from "@/lib/accounts";
import { actorOf, authorize, errorResponse, fail, json, notFound, TEAM_ROLES, userIdParam } from "../../../../_http";

/** Sign a member out of every device. */
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
    await revokeAllSessions(id, actor);
    return json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
