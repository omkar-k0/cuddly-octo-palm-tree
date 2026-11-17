import "server-only";
import { domains, type DomainId } from "@/config/domains";
import { loadDomainDocuments } from "@/lib/retrieval/local";
import type { SourceDocument } from "@/lib/retrieval/types";
import { effectiveStatus, getStore, type EffectiveStatus, type VerificationEvent } from "./store";

export interface CatalogEntry {
  doc: SourceDocument;
  status: EffectiveStatus;
  latest: VerificationEvent | undefined;
}

export interface Catalog {
  entries: CatalogEntry[];
  storeKind: "postgres" | null;
  storeError: string | null;
}

/** Every source in the library with its current verification status. */
export async function loadCatalog(): Promise<Catalog> {
  const docs = (await Promise.all(domains.map((d) => loadDomainDocuments(process.cwd(), d.id)))).flat();
  let latest = new Map<string, VerificationEvent>();
  let storeKind: Catalog["storeKind"] = null;
  let storeError: string | null = null;
  try {
    const store = await getStore();
    storeKind = store?.kind ?? null;
    if (store) latest = await store.latest();
  } catch (e) {
    storeError = (e as Error).message;
  }
  return {
    storeKind,
    storeError,
    entries: docs.map((doc) => {
      const ev = latest.get(doc.meta.id);
      return { doc, latest: ev, status: effectiveStatus({ hash: doc.hash, frontMatterVerified: doc.meta.verified }, ev) };
    }),
  };
}

export async function findSource(id: string): Promise<SourceDocument | undefined> {
  for (const d of domains) {
    const doc = (await loadDomainDocuments(process.cwd(), d.id)).find((x) => x.meta.id === id);
    if (doc) return doc;
  }
  return undefined;
}

export function progressByDomain(entries: CatalogEntry[]) {
  return domains.map((d) => {
    const mine = entries.filter((e) => e.doc.domain === (d.id as DomainId));
    return {
      domain: d,
      total: mine.length,
      verified: mine.filter((e) => e.status === "verified").length,
      attention: mine.filter((e) => e.status === "needs_changes" || e.status === "stale").length,
      rejected: mine.filter((e) => e.status === "rejected").length,
    };
  });
}
