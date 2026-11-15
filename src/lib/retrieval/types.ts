import { z } from "zod";
import type { DomainId } from "@/config/domains";

/**
 * Front-matter every source document must carry. A document is either a
 * statute provision (act + section) or a judgment (case + court + year).
 */
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
    last_checked: z.coerce.string().optional(),
    keywords: z.array(z.string()).default([]),
    note: z.string().optional(),
  })
  .refine((m) => (m.type === "judgment" ? !!m.case : !!m.act), {
    message: "statutes need `act`; judgments need `case`",
  });

export type SourceMeta = z.infer<typeof sourceMetaSchema>;

export interface SourceDocument {
  meta: SourceMeta;
  domain: DomainId;
  body: string;
  /** Path relative to the repo root, for debugging only. */
  path: string;
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
}

/**
 * The retrieval contract. V0 uses LocalFileRetriever (BM25 over sources/).
 * A vector store or a hosted search can replace it behind this interface.
 */
export interface Retriever {
  search(query: RetrievalQuery): Promise<Passage[]>;
}
