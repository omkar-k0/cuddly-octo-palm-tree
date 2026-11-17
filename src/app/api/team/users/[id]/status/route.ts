import { z } from "zod";
import { setUserStatus } from "@/lib/accounts";
import { actorOf, authorize, errorResponse, json, notFound, readBody, TEAM_ROLES, userIdParam } from "../../../_http";

const Body = z.object({ status: z.enum(["active", "suspended"]) });

/** Suspend or reactivate a member. Suspending ends their sessions. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await authorize(request, TEAM_ROLES);
  if (auth.response) return auth.response;
  const id = await userIdParam(ctx);
  if (!id) return notFound();
  const body = await readBody(request, Body);
  if (body.response) return body.response;

  try {
    const user = await setUserStatus(id, body.data.status, actorOf(auth.user));
    return json({ user });
  } catch (e) {
    return errorResponse(e);
  }
}
