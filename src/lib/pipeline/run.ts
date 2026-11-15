import { OUT_OF_SCOPE, type DomainId } from "@/config/domains";
import { gating } from "@/config/gating";
import { site } from "@/config/site";
import { scrubPII } from "@/lib/privacy/scrub";
import { getRetriever, type Retriever } from "@/lib/retrieval";
import { draftLive, draftMock } from "./answer";
import { classifyLive, classifyMock } from "./classify";
import { gate, UNVERIFIABLE_SUMMARY } from "./gate";
import { llmMode } from "./llm";
import type { AnswerResponse, Classification, EscalationReason } from "./types";

export interface RunOptions {
  hint?: DomainId;
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

export function todayInIndia(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
}

/**
 * The full pipeline: scrub → classify → retrieve → answer → gate.
 * Does not log or store the query or the answer.
 */
export async function answerQuery(rawQuery: string, opts: RunOptions = {}): Promise<RunResult> {
  const mode = opts.mode ?? llmMode();
  const today = opts.today ?? todayInIndia();
  const retriever = opts.retriever ?? getRetriever();
  const { text, redactions } = scrubPII(rawQuery);

  const base = { redactions, disclaimer: site.disclaimerShort, mode } as const;

  const classification =
    mode === "live" ? await classifyLive(text, { today, hint: opts.hint }) : classifyMock(text, { hint: opts.hint });

  const preReasons = (): EscalationReason[] => {
    const r: EscalationReason[] = [];
    if (classification.criminal) r.push("criminal_matter");
    if (classification.deadline_days !== null && classification.deadline_days < gating.urgentDeadlineDays)
      r.push("deadline_under_7_days");
    return r;
  };

  if (classification.route === OUT_OF_SCOPE) {
    const reasons = preReasons();
    return {
      response: {
        ...base,
        status: "out_of_scope",
        domain: null,
        summary: OUT_OF_SCOPE_SUMMARY,
        steps: [],
        citations: [],
        confidence: 0,
        escalate: reasons.length > 0,
        escalation_reasons: reasons,
        follow_ups: [],
      },
      trace: { classification, retrieved: [] },
    };
  }

  const domain = classification.route;
  const passages = await retriever.search({ text, domain, k: gating.topK });
  const retrieved = passages.map((p) => p.doc.meta.id);

  // Nothing retrieved: say so, and do not spend an answer call guessing.
  if (passages.length === 0) {
    const reasons = [...preReasons(), "low_confidence" as const];
    return {
      response: {
        ...base,
        status: "unverifiable",
        domain,
        summary: UNVERIFIABLE_SUMMARY,
        steps: ["Speak to an advocate who practises in this area. Take every document and message you have."],
        citations: [],
        confidence: 0,
        escalate: true,
        escalation_reasons: reasons,
        follow_ups: [],
      },
      trace: { classification, retrieved },
    };
  }

  const result = mode === "live" ? await draftLive(text, domain, passages, today) : draftMock(passages);

  if (result.kind === "declined") {
    return {
      response: {
        ...base,
        status: "unverifiable",
        domain,
        summary: UNVERIFIABLE_SUMMARY,
        steps: ["Speak to an advocate who practises in this area."],
        citations: [],
        confidence: 0,
        escalate: true,
        escalation_reasons: [...preReasons(), "model_declined", "low_confidence"],
        follow_ups: [],
      },
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
    },
    trace: { classification, retrieved },
  };
}
