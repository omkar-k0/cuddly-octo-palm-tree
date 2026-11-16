import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { DomainId } from "@/config/domains";
import { effort, models } from "@/config/models";
import type { Passage } from "@/lib/retrieval";
import { anthropic } from "./llm";
import type { QueryContext } from "./context";
import { loadAnswerSystemPrompt } from "./prompts";
import type { MissingContext } from "./types";

/** What the answer model returns. Labels refer to the passages we sent (S1…Sk). */
export const AnswerDraft = z.object({
  unverifiable: z.boolean(),
  summary: z.string(),
  steps: z.array(z.string()),
  citations: z.array(z.object({ label: z.string(), pinpoint: z.string().nullable() })),
  confidence: z.number(),
  deadline_days: z.number().int().nullable(),
  follow_ups: z.array(z.string()),
});
export type AnswerDraft = z.infer<typeof AnswerDraft>;

export type DraftResult =
  | { kind: "draft"; draft: AnswerDraft }
  | { kind: "declined" };

export const passageLabel = (i: number) => `S${i + 1}`;

/** Where and when a source applies, in words the model (and a reader) can use. */
export function applicability(m: Passage["doc"]["meta"]): { where: string; when: string } {
  const where =
    m.jurisdiction === "central" ? "All of India" : m.jurisdiction === "state" ? `${m.state} only` : `${m.local}, ${m.state} only`;
  const when =
    m.effective_from && m.effective_until
      ? `${m.effective_from} to ${m.effective_until}`
      : m.effective_from
        ? `from ${m.effective_from}`
        : m.effective_until
          ? `up to ${m.effective_until}`
          : "no date limit recorded";
  return { where, when };
}

export function renderSources(passages: Passage[]): string {
  return passages
    .map((p, i) => {
      const m = p.doc.meta;
      const head =
        m.type === "judgment"
          ? `${m.case}${m.court ? `, ${m.court}` : ""}${m.year ? ` (${m.year})` : ""}`
          : `${m.act}${m.section ? `, ${m.section}` : ""}`;
      const a = applicability(m);
      return `<source label="${passageLabel(i)}" type="${m.type}" applies_in="${a.where}" applies_to_events="${a.when}">\n<heading>${head}</heading>\n<title>${m.title}</title>\n${m.note ? `<note>${m.note}</note>\n` : ""}<text>\n${p.doc.body}\n</text>\n</source>`;
    })
    .join("\n\n");
}

export function renderContext(ctx: QueryContext, missing: MissingContext[]): string {
  return [
    "<context>",
    `<event_date>${ctx.event_date ?? "unknown"}</event_date>`,
    `<state>${ctx.state ?? "unknown"}</state>`,
    `<local>${ctx.local ?? "unknown"}</local>`,
    missing.length ? `<missing>${missing.join(", ")}</missing>` : "",
    "</context>",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Live answer: Opus, JSON only, grounded in the retrieved passages. */
export async function draftLive(
  query: string,
  domain: DomainId,
  passages: Passage[],
  today: string,
  context: QueryContext,
  missing: MissingContext[],
): Promise<DraftResult> {
  const system = await loadAnswerSystemPrompt(domain);
  const user = `<today>${today}</today>\n\n${renderContext(context, missing)}\n\n<sources>\n${renderSources(passages)}\n</sources>\n\n<question>\n${query}\n</question>`;

  const res = await anthropic().beta.messages.parse({
    model: models.answerer,
    max_tokens: 16000,
    // Server-side fallback: if a safety classifier declines, the API re-runs
    // the request on a fallback model inside the same call.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    output_config: { effort: effort.answerer, format: betaZodOutputFormat(AnswerDraft) },
    messages: [{ role: "user", content: user }],
  });

  if (res.stop_reason === "refusal" || !res.parsed_output) return { kind: "declined" };
  return { kind: "draft", draft: res.parsed_output };
}

/**
 * Mock answer: a fixed template built from the retrieved passages, so the
 * UI and the gate can be exercised without an API key. Clearly labelled.
 */
export function draftMock(passages: Passage[], context: QueryContext, missing: MissingContext[]): DraftResult {
  const top = passages.slice(0, 2);
  const names = top.map((p, i) => {
    const m = p.doc.meta;
    const name = m.type === "judgment" ? m.case : `${m.section ? `${m.section}, ` : ""}${m.act}`;
    return `${name} [${passageLabel(i)}]`;
  });
  const best = passages[0]?.score ?? 0;
  const followUps: string[] = [];
  if (missing.includes("event_date")) followUps.push("When did this happen? The law changed on 21 November 2025.");
  if (missing.includes("state")) followUps.push("Which state (and city) is this in?");
  const where = context.state ? ` We looked at law that applies in ${context.state}${context.local ? ` (${context.local})` : ""}.` : "";
  const when = context.event_date ? ` We used the law in force for events in ${context.event_date}.` : "";
  return {
    kind: "draft",
    draft: {
      unverifiable: false,
      summary:
        `Mock answer for testing the layout. The closest sources in our library are ${names.join(" and ")}. ` +
        `A live answer would explain how they apply to your situation in plain words.${where}${when}`,
      steps: [
        `Read the provision summarised in ${names[0]}.`,
        "Collect your documents: appointment letter, payslips, emails and any notice you received.",
        "Write down the key dates, especially any deadline you have been given.",
      ],
      citations: top.map((_, i) => ({ label: passageLabel(i), pinpoint: null })),
      confidence: Math.min(0.85, 0.45 + best / 20),
      deadline_days: null,
      follow_ups: [...followUps, "Did you receive anything in writing?"].slice(0, 3),
    },
  };
}
