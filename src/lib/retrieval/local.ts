import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { domains, type DomainId } from "@/config/domains";
import { applies, emptyContext } from "@/lib/pipeline/context";
import { BM25 } from "./bm25";
import {
  sourceMetaSchema,
  type Passage,
  type RetrievalQuery,
  type Retriever,
  type SourceDocument,
} from "./types";

/**
 * Reads Markdown files from sources/<domain>/ (front-matter + body) and
 * ranks them with BM25. Files starting with "_" (templates) and README.md
 * are skipped. Invalid files are skipped with a warning that names the file,
 * never any user text.
 */
export class LocalFileRetriever implements Retriever {
  private indexes = new Map<DomainId, Promise<BM25<SourceDocument>>>();

  constructor(
    private root = process.cwd(),
    private minScore = 0,
  ) {}

  async search({ text, domain, k, context }: RetrievalQuery): Promise<Passage[]> {
    const index = await this.index(domain);
    const ctx = context ?? emptyContext;
    return index
      .search(text, k, (d) => applies(d.meta, ctx))
      .filter((r) => r.score >= this.minScore)
      .map((r) => ({ doc: r.item, score: r.score }));
  }

  async documents(domain: DomainId): Promise<SourceDocument[]> {
    return loadDomainDocuments(this.root, domain);
  }

  private index(domain: DomainId) {
    let idx = this.indexes.get(domain);
    if (!idx) {
      idx = loadDomainDocuments(this.root, domain).then(
        (docs) =>
          new BM25(docs, (d) =>
            // Title, act and keywords are repeated to weight them above body text.
            [d.meta.title, d.meta.title, d.meta.act, d.meta.case, d.meta.keywords.join(" "), d.meta.keywords.join(" "), d.body]
              .filter(Boolean)
              .join(" "),
          ),
      );
      this.indexes.set(domain, idx);
    }
    return idx;
  }
}

export async function loadDomainDocuments(root: string, domain: DomainId): Promise<SourceDocument[]> {
  const cfg = domains.find((d) => d.id === domain);
  if (!cfg) return [];
  const dir = path.join(root, cfg.sourcesDir);
  let files: string[];
  try {
    files = await fs.readdir(dir);
  } catch {
    return [];
  }
  const docs: SourceDocument[] = [];
  for (const file of files.sort()) {
    if (!file.endsWith(".md") || file.startsWith("_") || file.toLowerCase() === "readme.md") continue;
    const rel = path.join(cfg.sourcesDir, file);
    const raw = await fs.readFile(path.join(root, rel), "utf8");
    const parsed = matter(raw);
    const meta = sourceMetaSchema.safeParse(parsed.data);
    if (!meta.success) {
      console.warn(`[sources] skipping ${rel}: ${meta.error.issues.map((i) => i.message).join("; ")}`);
      continue;
    }
    docs.push({ meta: meta.data, domain, body: parsed.content.trim(), path: rel });
  }
  return docs;
}
