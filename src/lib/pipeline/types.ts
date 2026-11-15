import type { DomainId, Route } from "@/config/domains";
import type { RedactionType } from "@/lib/privacy/scrub";

export type AnswerStatus = "answered" | "unverifiable" | "out_of_scope" | "error";

export type EscalationReason =
  | "criminal_matter"
  | "deadline_under_7_days"
  | "low_confidence"
  | "model_declined";

export interface Citation {
  /** 1-based number shown in the text as [n]. */
  n: number;
  source_id: string;
  type: "statute" | "rule" | "judgment" | "notification";
  title: string;
  act: string | null;
  section: string | null;
  case: string | null;
  court: string | null;
  year: number | null;
  pinpoint: string | null;
  source_url: string | null;
  verified: boolean;
}

export interface Classification {
  route: Route;
  criminal: boolean;
  /** Days until the nearest deadline the user mentions, or null. */
  deadline_days: number | null;
  confidence: number;
}

/** The JSON every answer returns. */
export interface AnswerResponse {
  status: AnswerStatus;
  domain: DomainId | null;
  summary: string;
  steps: string[];
  citations: Citation[];
  confidence: number;
  escalate: boolean;
  escalation_reasons: EscalationReason[];
  follow_ups: string[];
  redactions: { type: RedactionType; count: number }[];
  disclaimer: string;
  mode: "live" | "mock";
}
