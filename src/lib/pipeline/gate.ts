import { gating } from "@/config/gating";
import type { Passage } from "@/lib/retrieval";
import { passageLabel, type AnswerDraft } from "./answer";
import type { Citation, EscalationReason } from "./types";

export interface GateInput {
  draft: AnswerDraft;
  passages: Passage[];
  criminal: boolean;
  deadline_days: number | null;
}

export interface GateOutput {
  unverifiable: boolean;
  summary: string;
  steps: string[];
  citations: Citation[];
  confidence: number;
  escalate: boolean;
  escalation_reasons: EscalationReason[];
  follow_ups: string[];
}

export const UNVERIFIABLE_SUMMARY =
  "Unverifiable. We could not find a provision or judgment in our source library that answers this, so we will not guess. Please speak to an advocate.";

/**
 * The confidence gate. Runs on the server after every answer, live or mock.
 * It never trusts the model's own citations or confidence on their own.
 */
export function gate({ draft, passages, criminal, deadline_days }: GateInput): GateOutput {
  // 1. Keep only citations that point at a passage we actually retrieved.
  const byLabel = new Map(passages.map((p, i) => [passageLabel(i), p]));
  const numbering = new Map<string, number>();
  const citations: Citation[] = [];
  for (const c of draft.citations) {
    const p = byLabel.get(c.label.trim().toUpperCase());
    if (!p || numbering.has(p.doc.meta.id)) continue;
    const n = citations.length + 1;
    numbering.set(c.label.trim().toUpperCase(), n);
    numbering.set(p.doc.meta.id, n);
    const m = p.doc.meta;
    citations.push({
      n,
      source_id: m.id,
      type: m.type,
      title: m.title,
      act: m.act ?? null,
      section: m.section ?? null,
      case: m.case ?? null,
      court: m.court ?? null,
      year: m.year ?? null,
      pinpoint: c.pinpoint,
      source_url: m.source_url ?? null,
      verified: m.verified,
      reviewed_by: m.verified ? (m.reviewed_by ?? null) : null,
      jurisdiction: m.jurisdiction,
      state: m.state ?? null,
      local: m.local ?? null,
      effective_from: m.effective_from ?? null,
      effective_until: m.effective_until ?? null,
    });
  }

  // 2. Rewrite [S2] markers to [n]; drop markers that point nowhere.
  const relabel = (s: string) =>
    s
      .replace(/\[(S\d+)\]/gi, (_m, label: string) => {
        const n = numbering.get(label.toUpperCase());
        return n ? `[${n}]` : "";
      })
      .replace(/\s+([.,;:])/g, "$1")
      .replace(/\s{2,}/g, " ")
      .trim();

  // 3. No valid citation, or the model says the sources do not cover it: unverifiable.
  const unverifiable = draft.unverifiable || citations.length === 0;
  let confidence = clamp01(draft.confidence);
  if (unverifiable) confidence = Math.min(confidence, gating.unverifiableConfidenceCap);

  // 4. Escalation rules.
  const deadlines = [deadline_days, draft.deadline_days].filter((d): d is number => d !== null && d >= 0);
  const nearest = deadlines.length ? Math.min(...deadlines) : null;
  const reasons: EscalationReason[] = [];
  if (criminal) reasons.push("criminal_matter");
  if (nearest !== null && nearest < gating.urgentDeadlineDays) reasons.push("deadline_under_7_days");
  if (confidence < gating.lowConfidence) reasons.push("low_confidence");

  return {
    unverifiable,
    summary: unverifiable ? UNVERIFIABLE_SUMMARY : relabel(draft.summary),
    steps: unverifiable
      ? ["Speak to an advocate who practises in this area. Take every document and message you have."]
      : draft.steps.map(relabel).filter(Boolean),
    citations: unverifiable ? [] : citations,
    confidence,
    escalate: reasons.length > 0,
    escalation_reasons: reasons,
    follow_ups: draft.follow_ups.slice(0, 3),
  };
}

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);
