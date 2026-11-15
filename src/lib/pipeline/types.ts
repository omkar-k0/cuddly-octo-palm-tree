import type { DomainId, Route } from "@/config/domains";
import type { RedactionType } from "@/lib/privacy/scrub";
import type { QueryContext } from "./context";

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
  jurisdiction: "central" | "state" | "local";
  state: string | null;
  local: string | null;
  effective_from: string | null;
  effective_until: string | null;
}

export interface Classification {
  route: Route;
  criminal: boolean;
  /** Days until the nearest deadline the user mentions, or null. */
  deadline_days: number | null;
  confidence: number;
  /** When and where, as read from the text. */
  context: QueryContext;
  /** Legal terms to add to the search (live classifier only). */
  search_terms: string[];
}

export type MissingContext = "event_date" | "state";

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
  /** The time and place the answer was based on. */
  context: QueryContext;
  /** Facts that would change which law applies. The UI asks for them. */
  missing_context: MissingContext[];
  disclaimer: string;
  mode: "live" | "mock";
}
