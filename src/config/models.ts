/**
 * Claude model IDs. Taken from Anthropic's current model table (checked
 * Nov 2026), not from memory. Change here only.
 *
 * - classifier: cheap, fast routing call
 * - answerer:   the cited answer, run only when sources were retrieved
 */
export const models = {
  classifier: "claude-haiku-5-5",
  answerer: "claude-opus-5-5",
} as const;

/** Effort per call. Opus 5.5 defaults to "medium"; set explicitly. */
export const effort = {
  classifier: "low",
  answerer: "medium",
} as const;
