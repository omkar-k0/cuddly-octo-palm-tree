import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { domains, domainIds, OUT_OF_SCOPE, type DomainId, type Route } from "@/config/domains";
import { effort, models } from "@/config/models";
import { tokenize } from "@/lib/retrieval/bm25";
import { anthropic } from "./llm";
import { loadClassifierPrompt } from "./prompts";
import { normaliseState } from "@/config/jurisdictions";
import { contextFromText, emptyContext, mergeContext } from "./context";
import { deadlineDaysFromText, looksCriminal } from "./signals";
import type { Classification } from "./types";

const ClassifierOutput = z.object({
  route: z.enum([...domainIds, OUT_OF_SCOPE]),
  criminal: z.boolean(),
  deadline_days: z.number().int().nullable(),
  confidence: z.number(),
  event_date: z.string().nullable(),
  state: z.string().nullable(),
  local: z.string().nullable(),
  search_terms: z.array(z.string()),
});

function taxonomyBlock(): string {
  return domains
    .map((d) => `- ${d.id}: ${d.title}. ${d.blurb} Topics: ${d.topics.join("; ")}.`)
    .join("\n");
}

/** Live classifier: one cheap structured call. */
export async function classifyLive(
  text: string,
  opts: { today: string; hint?: DomainId },
): Promise<Classification> {
  const system = (await loadClassifierPrompt()).replace("{{TAXONOMY}}", taxonomyBlock());
  const user = [
    `<today>${opts.today}</today>`,
    opts.hint ? `<user_selected_area>${opts.hint}</user_selected_area>` : "",
    `<query>\n${text}\n</query>`,
  ]
    .filter(Boolean)
    .join("\n");

  const res = await anthropic().messages.parse({
    model: models.classifier,
    max_tokens: 2048,
    system,
    output_config: { effort: effort.classifier, format: zodOutputFormat(ClassifierOutput) },
    messages: [{ role: "user", content: user }],
  });

  if (res.stop_reason === "refusal" || !res.parsed_output) {
    // Fall back to the keyword router rather than failing the request.
    return classifyMock(text, opts);
  }
  const out = res.parsed_output;
  return mergeSignals(text, opts.today, {
    route: out.route,
    criminal: out.criminal,
    deadline_days: out.deadline_days,
    confidence: clamp01(out.confidence),
    context: {
      event_date: /^\d{4}(-\d{2}(-\d{2})?)?$/.test(out.event_date ?? "") ? out.event_date : null,
      state: normaliseState(out.state),
      local: out.local?.trim() || null,
    },
    search_terms: out.search_terms.slice(0, 8),
  });
}

/** Mock classifier: keyword overlap with each domain's keyword list. */
export function classifyMock(text: string, opts: { hint?: DomainId; today?: string } = {}): Classification {
  const tokens = new Set(tokenize(text));
  const lower = text.toLowerCase();
  const scores = domains.map((d) => {
    let s = 0;
    for (const kw of d.keywords) {
      if (kw.includes(" ") ? lower.includes(kw) : tokens.has(tokenize(kw)[0] ?? kw)) s += 1;
    }
    if (opts.hint === d.id) s += 0.5;
    return { id: d.id as DomainId, s };
  });
  scores.sort((a, b) => b.s - a.s);
  const [top, second] = scores;
  const route: Route = top.s >= 1 ? top.id : OUT_OF_SCOPE;
  const margin = top.s - (second?.s ?? 0);
  return mergeSignals(text, opts.today ?? new Date().toISOString().slice(0, 10), {
    route,
    criminal: false,
    deadline_days: null,
    confidence: route === OUT_OF_SCOPE ? 0.5 : clamp01(0.5 + 0.1 * margin),
    context: emptyContext,
    search_terms: [],
  });
}

/** OR the model's flags with the deterministic rules; take the nearer deadline. */
function mergeSignals(text: string, today: string, c: Classification): Classification {
  const ruleDeadline = deadlineDaysFromText(text);
  const deadlines = [c.deadline_days, ruleDeadline].filter((d): d is number => d !== null && d >= 0);
  return {
    ...c,
    context: mergeContext(c.context, contextFromText(text, today)),
    criminal: c.criminal || looksCriminal(text),
    deadline_days: deadlines.length ? Math.min(...deadlines) : null,
  };
}

export const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);
