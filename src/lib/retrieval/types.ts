import { z } from "zod";
import type { DomainId } from "@/config/domains";
import type { QueryContext } from "@/lib/pipeline/context";

/**
 * Front-matter every source document must carry. A document is either a
 * statute provision (act + section) or a judgment (case + court + year).
 */
/** YAML turns bare dates into Date objects; keep them as YYYY-MM-DD strings. */
const isoDate = z.preprocess(
  (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "dates must be YYYY-MM-DD"),
);

export const sourceMetaSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "lowercase id, a-z 0-9 and dashes"),
    type: z.enum(["statute", "rule", "judgment", "notification"]),
    title: z.string(),
    act: z.string().optional(),
    section: z.string().optional(),
    case: z.string().optional(),
    court: z.string().optional(),
    year: z.coerce.number().int().optional(),
    citation: z.string().optional(),
    source_url: z.string().url().optional(),
    verified: z.boolean().default(false),
    last_checked: isoDate.optional(),
    keywords: z.array(z.string()).default([]),
    note: z.string().optional(),
    /** Where the law applies. "central" applies everywhere. */
    jurisdiction: z.enum(["central", "state", "local"]).default("central"),
    /** State or UT name, for state and local law. */
    state: z.string().optional(),
    /** City, district, municipality or village, for local law. */
    local: z.string().optional(),
    /** The law applies to events on or after this date (YYYY-MM-DD). */
    effective_from: isoDate.optional(),
    /** The law applies to events on or before this date (YYYY-MM-DD). */
    effective_until: isoDate.optional(),
    /** Provenance for scraped documents. */
    provenance: z.enum(["indiacode", "manual"]).default("manual"),
    act_id: z.string().optional(),
    scraped_at: isoDate.optional(),
    enforcement_note: z.string().optional(),
  })
  .refine((m) => (m.type === "judgment" ? !!m.case : !!m.act), {
    message: "statutes need `act`; judgments need `case`",
  })
  .refine((m) => m.jurisdiction === "central" || !!m.state, {
    message: "state and local law need `state`",
  })
  .refine((m) => m.jurisdiction !== "local" || !!m.local, {
    message: "local law needs `local`",
  });

export type SourceMeta = z.infer<typeof sourceMetaSchema> & {
  /**
   * Public label of the lawyer who verified this source ("Adv. <name>").
   * Not front-matter: retrieval sets it from the verification overlay, and
   * only when REVIEWER_ATTRIBUTION is "named" and the source is verified.
   */
  reviewed_by?: string | null;
};

export interface SourceDocument {
  meta: SourceMeta;
  domain: DomainId;
  body: string;
  /** Path relative to the repo root, for debugging only. */
  path: string;
  /** sha256 of the body; a lawyer's verification is tied to this. */
  hash: string;
}

export interface Passage {
  doc: SourceDocument;
  /** Retrieval score, higher is better. Not comparable across retrievers. */
  score: number;
}

export interface RetrievalQuery {
  text: string;
  domain: DomainId;
  k: number;
  /** Only documents that apply to this time and place are returned. */
  context?: QueryContext;
}

/**
 * The retrieval contract. V0 uses LocalFileRetriever (BM25 over sources/).
 * A vector store or a hosted search can replace it behind this interface.
 */
export interface Retriever {
  search(query: RetrievalQuery): Promise<Passage[]>;
}
