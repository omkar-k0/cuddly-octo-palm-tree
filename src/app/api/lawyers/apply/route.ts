import { sameOrigin } from "@/lib/admin/auth";
import { createApplication, DuplicateApplication, OnboardingUnavailable } from "@/lib/onboarding/applications";
import { hitRateLimit } from "@/lib/onboarding/rate-limit";
import { filledTooFast, formMetaSchema, parseApplication } from "@/lib/onboarding/schema";

const MAX_BODY_BYTES = 32 * 1024;
const NO_STORE = { "Cache-Control": "no-store" };
const fail = (status: number, error: string, extra: Record<string, unknown> = {}, headers: Record<string, string> = {}) =>
  Response.json({ error, ...extra }, { status, headers: { ...NO_STORE, ...headers } });

/**
 * POST /api/lawyers/apply: a lawyer applies to become a reviewer.
 *
 * Public, so it is defended in layers: same-origin, JSON only, a size cap,
 * a honeypot field, a minimum fill time, validation, and a per-IP rate limit.
 * The body holds personal data and is never logged.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail(403, "Bad origin.");
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return fail(415, "Send JSON.");
  }
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return fail(413, "The request is too large.");

  const text = await request.text().catch(() => "");
  if (text.length > MAX_BODY_BYTES) return fail(413, "The request is too large.");
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return fail(400, "The request is not valid JSON.");
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) return fail(400, "The request is not valid.");
  const raw = body as Record<string, unknown>;

  // Bots: a filled honeypot, or a form sent faster than a person can fill it in.
  // The answer is deliberately vague.
  const meta = formMetaSchema.safeParse(raw);
  if (raw.company_website || !meta.success || filledTooFast(meta.data)) {
    return fail(400, "We could not accept this submission. Please reload the page and try again.");
  }

  const parsed = parseApplication(raw);
  if (!parsed.ok) return fail(400, "Please check the highlighted fields.", { fields: parsed.fields });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const wait = hitRateLimit(ip);
  if (wait !== null) {
    return fail(429, "Too many applications from this connection. Please try again later.", {}, { "Retry-After": String(wait) });
  }

  try {
    await createApplication(parsed.data);
    return Response.json({ ok: true }, { status: 201, headers: NO_STORE });
  } catch (e) {
    if (e instanceof OnboardingUnavailable) return fail(503, "Applications are not open right now. Please try again later.");
    if (e instanceof DuplicateApplication) {
      // Same answer as a new application, so the endpoint does not reveal whether an email has applied.
      // The partial unique index has already prevented the duplicate row. Nothing is logged.
      return Response.json({ ok: true }, { status: 201, headers: NO_STORE });
    }
    console.error(`[apply] save failed: ${(e as Error).name}`);
    return fail(500, "We could not save your application. Please try again later.");
  }
}
