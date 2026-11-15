import { getDomain, OUT_OF_SCOPE, type DomainId } from "@/config/domains";
import { gating } from "@/config/gating";
import { site } from "@/config/site";
import { scrubPII } from "@/lib/privacy/scrub";
import { getRetriever, type Passage, type Retriever } from "@/lib/retrieval";
import { draftLive, draftMock } from "./answer";
import { classifyLive, classifyMock } from "./classify";
import { mergeContext, type QueryContext } from "./context";
import { gate, UNVERIFIABLE_SUMMARY } from "./gate";
import { llmMode } from "./llm";
import type { AnswerResponse, Classification, EscalationReason, MissingContext } from "./types";

export interface RunOptions {
  hint?: DomainId;
  /** Time and place the user entered in the form. These win over anything read from the text. */
  context?: Partial<QueryContext>;
  mode?: "live" | "mock";
  retriever?: Retriever;
  /** ISO date (YYYY-MM-DD) in India. Defaults to now. */
  today?: string;
}

export interface RunResult {
  response: AnswerResponse;
  /** For the eval only. Never logged, never sent to the client. */
  trace: { classification: Classification; retrieved: string[] };
}

export const OUT_OF_SCOPE_SUMMARY =
  "This falls outside the four areas we cover (Corporate, Employment, Real Estate, Technology & IP), so we cannot give you a cited explanation. An advocate can tell you where you stand.";

const ADVOCATE_STEP = "Speak to an advocate who practises in this area. Take every document and message you have.";

export function todayInIndia(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
}

/**
 * Which facts, if we knew them, would change which law applies?
 * - event_date: unknown, and the retrieved law changes over time (e.g. old Acts vs Labour Codes)
 * - state: unknown, and the area often turns on state law (e.g. tenancy)
 */
export function missingContext(ctx: QueryContext, domain: DomainId, passages: Passage[]): MissingContext[] {
  const out: MissingContext[] = [];
  if (!ctx.event_date && passages.some((p) => p.doc.meta.effective_from || p.doc.meta.effective_until)) {
    out.push("event_date");
  }
  if (!ctx.state && getDomain(domain)?.stateSensitive) out.push("state");
  return out;
}

/**
 * The full pipeline: scrub → classify → retrieve (filtered by time and place)
 * → answer → gate. Does not log or store the query or the answer.
 */
export async function answerQuery(rawQuery: string, opts: RunOptions = {}): Promise<RunResult> {
  const mode = opts.mode ?? llmMode();
  const today = opts.today ?? todayInIndia();
  const retriever = opts.retriever ?? getRetriever();
  const { text, redactions } = scrubPII(rawQuery);

  const classification =
    mode === "live"
      ? await classifyLive(text, { today, hint: opts.hint })
      : classifyMock(text, { hint: opts.hint, today });

  const context = mergeContext(opts.context ?? {}, classification.context);
  const base = { redactions, disclaimer: site.disclaimerShort, mode, context } as const;

  const preReasons = (): EscalationReason[] => {
    const r: EscalationReason[] = [];
    if (classification.criminal) r.push("criminal_matter");
    if (classification.deadline_days !== null && classification.deadline_days < gating.urgentDeadlineDays)
      r.push("deadline_under_7_days");
    return r;
  };

  const declined = (
    domain: DomainId | null,
    status: AnswerResponse["status"],
    summary: string,
    reasons: EscalationReason[],
    missing: MissingContext[] = [],
  ): AnswerResponse => ({
    ...base,
    status,
    domain,
    summary,
    steps: status === "out_of_scope" ? [] : [ADVOCATE_STEP],
    citations: [],
    confidence: 0,
    escalate: reasons.length > 0,
    escalation_reasons: reasons,
    follow_ups: [],
    missing_context: missing,
  });

  if (classification.route === OUT_OF_SCOPE) {
    return {
      response: declined(null, "out_of_scope", OUT_OF_SCOPE_SUMMARY, preReasons()),
      trace: { classification, retrieved: [] },
    };
  }

  const domain = classification.route;
  const passages = await retriever.search({ text, domain, k: gating.topK, context });
  const retrieved = passages.map((p) => p.doc.meta.id);
  const missing = missingContext(context, domain, passages);

  // Nothing retrieved: say so, and do not spend an answer call guessing.
  if (passages.length === 0) {
    return {
      response: declined(domain, "unverifiable", UNVERIFIABLE_SUMMARY, [...preReasons(), "low_confidence"], missing),
      trace: { classification, retrieved },
    };
  }

  const result =
    mode === "live"
      ? await draftLive(text, domain, passages, today, context, missing)
      : draftMock(passages, context, missing);

  if (result.kind === "declined") {
    return {
      response: declined(domain, "unverifiable", UNVERIFIABLE_SUMMARY, [...preReasons(), "model_declined", "low_confidence"], missing),
      trace: { classification, retrieved },
    };
  }

  const g = gate({
    draft: result.draft,
    passages,
    criminal: classification.criminal,
    deadline_days: classification.deadline_days,
  });

  return {
    response: {
      ...base,
      status: g.unverifiable ? "unverifiable" : "answered",
      domain,
      summary: g.summary,
      steps: g.steps,
      citations: g.citations,
      confidence: g.confidence,
      escalate: g.escalate,
      escalation_reasons: g.escalation_reasons,
      follow_ups: g.follow_ups,
      missing_context: missing,
    },
    trace: { classification, retrieved },
  };
}
