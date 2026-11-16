import { z } from "zod";
import { sameOrigin } from "@/lib/admin/auth";
import { findSource } from "@/lib/admin/catalog";
import { sessionFromRequest } from "@/lib/admin/session";
import { getStore, invalidateOverlay, STATUSES } from "@/lib/admin/store";

const Body = z
  .object({
    source_id: z.string().min(1).max(200),
    status: z.enum(STATUSES),
    note: z.string().max(2000).default(""),
    content_hash: z.string().regex(/^[0-9a-f]{64}$/),
  })
  .refine((b) => b.status === "verified" || b.note.trim().length > 0, {
    message: "A note is required for 'needs changes' and 'rejected'.",
  });

const NO_STORE = { "Cache-Control": "no-store" };
const fail = (status: number, error: string) => Response.json({ error }, { status, headers: NO_STORE });

/** POST /api/admin/verify: record a lawyer's decision on one source. */
export async function POST(request: Request) {
  const session = sessionFromRequest(request);
  if (!session) return fail(401, "Not signed in.");
  if (!sameOrigin(request)) return fail(403, "Bad origin.");

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, parsed.error.issues[0]?.message ?? "Invalid request.");
  const body = parsed.data;

  const doc = await findSource(body.source_id);
  if (!doc) return fail(404, "Unknown source.");
  // The decision must be about the text that is live now.
  if (doc.hash !== body.content_hash) return fail(409, "The source text has changed since you opened it. Reload and review again.");

  const store = await getStore();
  if (!store) return fail(503, "No verification database is configured (DATABASE_URL).");

  try {
    const event = await store.record({
      source_id: body.source_id,
      status: body.status,
      note: body.note.trim(),
      reviewer: session.email,
      content_hash: body.content_hash,
    });
    invalidateOverlay();
    return Response.json({ ok: true, event }, { headers: NO_STORE });
  } catch (e) {
    console.error(`[verify] save failed: ${(e as Error).name}`);
    return fail(502, "Could not save the decision. Try again.");
  }
}
