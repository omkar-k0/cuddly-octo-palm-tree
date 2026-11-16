import { describe, expect, it } from "vitest";
import { gate, UNVERIFIABLE_SUMMARY } from "@/lib/pipeline/gate";
import type { AnswerDraft } from "@/lib/pipeline/answer";
import type { Passage } from "@/lib/retrieval";

const passage = (id: string, verified = false): Passage => ({
  score: 5,
  doc: {
    domain: "employment",
    path: `sources/employment/${id}.md`,
    body: "text",
    meta: { id, type: "statute", title: id, act: "Some Act, 1972", section: "Section 4", verified, keywords: [], jurisdiction: "central", provenance: "manual" },
  },
});

const draft = (over: Partial<AnswerDraft> = {}): AnswerDraft => ({
  unverifiable: false,
  summary: "Gratuity is payable after five years [S1]. Interest applies on delay [S2].",
  steps: ["Apply in writing [S2]."],
  citations: [
    { label: "S1", pinpoint: "(1)" },
    { label: "S2", pinpoint: null },
  ],
  confidence: 0.82,
  deadline_days: null,
  follow_ups: ["a", "b", "c", "d"],
  ...over,
});

const passages = [passage("a"), passage("b")];
const base = { passages, criminal: false, deadline_days: null };

describe("gate", () => {
  it("passes a well-cited, confident answer without escalation", () => {
    const g = gate({ ...base, draft: draft() });
    expect(g.unverifiable).toBe(false);
    expect(g.escalate).toBe(false);
    expect(g.citations.map((c) => [c.n, c.source_id, c.act])).toEqual([
      [1, "a", "Some Act, 1972"],
      [2, "b", "Some Act, 1972"],
    ]);
    expect(g.summary).toBe("Gratuity is payable after five years [1]. Interest applies on delay [2].");
    expect(g.follow_ups).toHaveLength(3);
  });

  it("drops citations to passages that were not retrieved, and their markers", () => {
    const g = gate({
      ...base,
      draft: draft({ summary: "A [S1]. B [S9].", citations: [{ label: "S1", pinpoint: null }, { label: "S9", pinpoint: null }] }),
    });
    expect(g.citations).toHaveLength(1);
    expect(g.summary).toBe("A [1]. B.");
  });

  it("marks the answer unverifiable when no citation survives", () => {
    const g = gate({ ...base, draft: draft({ citations: [{ label: "S7", pinpoint: null }] }) });
    expect(g.unverifiable).toBe(true);
    expect(g.summary).toBe(UNVERIFIABLE_SUMMARY);
    expect(g.citations).toEqual([]);
    expect(g.confidence).toBeLessThanOrEqual(0.3);
    expect(g.escalation_reasons).toContain("low_confidence");
  });

  it("respects the model's own unverifiable flag", () => {
    const g = gate({ ...base, draft: draft({ unverifiable: true }) });
    expect(g.unverifiable).toBe(true);
  });

  it("escalates criminal matters even when confident", () => {
    const g = gate({ ...base, criminal: true, draft: draft() });
    expect(g.escalate).toBe(true);
    expect(g.escalation_reasons).toEqual(["criminal_matter"]);
  });

  it("escalates deadlines under 7 days, not at 7", () => {
    expect(gate({ ...base, deadline_days: 6, draft: draft() }).escalation_reasons).toEqual(["deadline_under_7_days"]);
    expect(gate({ ...base, deadline_days: 7, draft: draft() }).escalate).toBe(false);
    expect(gate({ ...base, draft: draft({ deadline_days: 2 }) }).escalation_reasons).toEqual(["deadline_under_7_days"]);
  });

  it("escalates low confidence", () => {
    const g = gate({ ...base, draft: draft({ confidence: 0.55 }) });
    expect(g.escalation_reasons).toEqual(["low_confidence"]);
  });

  it("clamps confidence to 0..1", () => {
    expect(gate({ ...base, draft: draft({ confidence: 7 }) }).confidence).toBe(1);
  });
});
