import { z } from "zod";
import { createUser } from "@/lib/accounts";
import { absoluteUrl, actorOf, authorize, errorResponse, json, readBody, TEAM_ROLES } from "../_http";

const Body = z
  .object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().toLowerCase().max(200).pipe(z.email()),
    role: z.enum(["owner", "admin", "lawyer"]),
    country: z.enum(["IN", "DE"]).nullish(),
  })
  .refine((b) => b.role !== "lawyer" || !!b.country, { path: ["country"], message: "Lawyers need a country." });

/** Create a member (status "invited") and return the one-time setup link. */
export async function POST(request: Request) {
  const auth = await authorize(request, TEAM_ROLES);
  if (auth.response) return auth.response;
  const body = await readBody(request, Body);
  if (body.response) return body.response;
  const { name, email, role, country } = body.data;

  try {
    const { user, setupPath } = await createUser(
      { name, email, role, country: role === "lawyer" ? (country ?? null) : null },
      actorOf(auth.user),
    );
    return json({ user, setupUrl: absoluteUrl(request, setupPath) }, 201);
  } catch (e) {
    return errorResponse(e);
  }
}
