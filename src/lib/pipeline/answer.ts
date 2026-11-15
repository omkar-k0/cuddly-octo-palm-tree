import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { DomainId } from "@/config/domains";
import { effort, models } from "@/config/models";
import type { Passage } from "@/lib/retrieval";
import { anthropic } from "./llm";
import { loadAnswerSystemPrompt } from "./prompts";

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

export function renderSources(passages: Passage[]): string {
  return passages
    .map((p, i) => {
      const m = p.doc.meta;
      const head =
        m.type === "judgment"
          ? `${m.case}${m.court ? `, ${m.court}` : ""}${m.year ? ` (${m.year})` : ""}`
          : `${m.act}${m.section ? `, ${m.section}` : ""}`;
      return `<source label="${passageLabel(i)}" type="${m.type}">\n<heading>${head}</heading>\n<title>${m.title}</title>\n<text>\n${p.doc.body}\n</text>\n</source>`;
    })
    .join("\n\n");
}

/** Live answer: Opus, JSON only, grounded in the retrieved passages. */
export async function draftLive(
  query: string,
  domain: DomainId,
  passages: Passage[],
  today: string,
): Promise<DraftResult> {
  const system = await loadAnswerSystemPrompt(domain);
  const user = `<today>${today}</today>\n\n<sources>\n${renderSources(passages)}\n</sources>\n\n<question>\n${query}\n</question>`;

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
export function draftMock(passages: Passage[]): DraftResult {
  const top = passages.slice(0, 2);
  const names = top.map((p, i) => {
    const m = p.doc.meta;
    const name = m.type === "judgment" ? m.case : `${m.section ? `${m.section}, ` : ""}${m.act}`;
    return `${name} [${passageLabel(i)}]`;
  });
  const best = passages[0]?.score ?? 0;
  return {
    kind: "draft",
    draft: {
      unverifiable: false,
      summary:
        `Mock answer for testing the layout. The closest sources in our library are ${names.join(" and ")}. ` +
        `A live answer would explain how they apply to your situation in plain words.`,
      steps: [
        `Read the provision summarised in ${names[0]}.`,
        "Collect your documents: appointment letter, payslips, emails and any notice you received.",
        "Write down the key dates, especially any deadline you have been given.",
      ],
      citations: top.map((_, i) => ({ label: passageLabel(i), pinpoint: null })),
      confidence: Math.min(0.85, 0.45 + best / 20),
      deadline_days: null,
      follow_ups: [
        "How long did you work for this employer?",
        "Did you receive anything in writing?",
      ],
    },
  };
}
