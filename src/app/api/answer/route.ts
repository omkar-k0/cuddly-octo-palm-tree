import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { domainIds } from "@/config/domains";
import { gating } from "@/config/gating";
import { answerQuery } from "@/lib/pipeline/run";

export const maxDuration = 60;

const Body = z.object({
  query: z.string().trim().min(gating.minQueryLength).max(gating.maxQueryLength),
  hint: z.enum(domainIds).optional(),
});

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

/**
 * POST /api/answer  { query, hint? }  →  AnswerResponse
 *
 * Privacy: the query and the answer are never logged or stored. Errors are
 * logged by type and status only.
 */
export async function POST(request: Request) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await request.json());
  } catch {
    return Response.json(
      {
        error: `Please describe your situation in ${gating.minQueryLength} to ${gating.maxQueryLength} characters.`,
      },
      { status: 400, headers: NO_STORE },
    );
  }

  try {
    const { response } = await answerQuery(body.query, { hint: body.hint });
    return Response.json(response, { headers: NO_STORE });
  } catch (err) {
    const status = err instanceof Anthropic.APIError ? err.status : undefined;
    const kind =
      err instanceof Anthropic.RateLimitError
        ? "rate_limited"
        : err instanceof Anthropic.APIConnectionError
          ? "connection"
          : err instanceof Anthropic.APIError
            ? "api_error"
            : "internal";
    // No query text, no answer text, no stack with user data.
    console.error(`[answer] failed: ${kind}${status ? ` ${status}` : ""}`);
    return Response.json(
      {
        error:
          kind === "rate_limited"
            ? "We are getting a lot of questions right now. Please try again in a minute."
            : "Something went wrong while preparing your answer. Please try again.",
      },
      { status: kind === "rate_limited" ? 429 : 502, headers: NO_STORE },
    );
  }
}
