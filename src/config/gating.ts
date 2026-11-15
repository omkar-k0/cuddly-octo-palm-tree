/** Thresholds for the confidence gate. See QUESTIONS.md #9–#11. */
export const gating = {
  /** Below this, escalate = true. */
  lowConfidence: 0.6,
  /** Escalate when a deadline is fewer than this many days away. */
  urgentDeadlineDays: 7,
  /** Confidence ceiling for answers with no valid citation. */
  unverifiableConfidenceCap: 0.3,
  /** Passages sent to the answerer. */
  topK: 5,
  /** Minimum BM25 score for a passage to count as retrieved. */
  minRetrievalScore: 1.5,
  /** Input length limits (characters). */
  minQueryLength: 12,
  maxQueryLength: 2000,
} as const;

/** Confidence bands used by the UI and the eval report. */
export const confidenceBands = [
  { id: "low", label: "Low", min: 0, max: 0.4 },
  { id: "guarded", label: "Guarded", min: 0.4, max: 0.6 },
  { id: "moderate", label: "Moderate", min: 0.6, max: 0.8 },
  { id: "high", label: "High", min: 0.8, max: 1.0001 },
] as const;

export function bandFor(confidence: number) {
  return (
    confidenceBands.find((b) => confidence >= b.min && confidence < b.max) ??
    confidenceBands[0]
  );
}
