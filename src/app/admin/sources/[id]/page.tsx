import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { StatusBadge, statusLabel } from "@/components/admin/status-badge";
import { domains } from "@/config/domains";
import { loadCatalog } from "@/lib/admin/catalog";
import { requireSession } from "@/lib/admin/session";
import { effectiveStatus, getStore, type VerificationEvent } from "@/lib/admin/store";
import { ReviewForm } from "./review-form";

export const metadata: Metadata = { title: "Review source" };

export default function SourcePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading source…</p>}>
        <SourceDetail params={params} />
      </Suspense>
    </div>
  );
}

async function SourceDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const { entries, storeKind } = await loadCatalog();
  const entry = entries.find((e) => e.doc.meta.id === id);
  if (!entry) notFound();
  const { doc } = entry;
  const m = doc.meta;

  let history: VerificationEvent[] = [];
  try {
    history = (await (await getStore())?.history(id)) ?? [];
  } catch {
    history = [];
  }

  const todo = entries.filter((e) => ["unverified", "stale", "needs_changes"].includes(e.status) && e.doc.meta.id !== id);
  const next = todo.find((e) => e.doc.domain === doc.domain) ?? todo[0];
  const where = m.jurisdiction === "central" ? "All of India" : m.local ? `${m.local}, ${m.state} only` : `${m.state} only`;
  const when =
    m.effective_from && m.effective_until
      ? `Events ${m.effective_from} to ${m.effective_until}`
      : m.effective_from
        ? `Events on or after ${m.effective_from}`
        : m.effective_until
          ? `Events up to ${m.effective_until}`
          : "No date limit recorded";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <Link href="/admin" className="text-muted-foreground hover:text-foreground">
          ← All sources
        </Link>
        {next && (
          <Link href={`/admin/sources/${next.doc.meta.id}`} className="text-muted-foreground hover:text-foreground">
            Next to review →
          </Link>
        )}
      </div>

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <article className="min-w-0">
          <p className="font-mono text-xs text-accent">
            {domains.find((d) => d.id === doc.domain)?.number} {domains.find((d) => d.id === doc.domain)?.title}
          </p>
          <h1 className="mt-2 font-serif text-3xl leading-tight sm:text-4xl">
            {[m.section, m.act ?? m.case].filter(Boolean).join(", ")}
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">{m.title}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <StatusBadge status={entry.status} />
            <span className="rounded-full border border-foreground/15 px-2.5 py-0.5 font-mono text-[0.68rem] text-muted-foreground">{where}</span>
            <span className="rounded-full border border-foreground/15 px-2.5 py-0.5 font-mono text-[0.68rem] text-muted-foreground">{when}</span>
            <span className="rounded-full border border-foreground/15 px-2.5 py-0.5 font-mono text-[0.68rem] text-muted-foreground">
              {m.provenance === "indiacode" ? "Scraped from India Code" : "Written by hand"}
            </span>
          </div>

          {entry.status === "stale" && (
            <p className="mt-5 rounded-xl border border-accent/40 bg-accent-soft p-4 text-sm text-accent">
              This source was verified, but its text has changed since. It is treated as unverified until reviewed again.
            </p>
          )}
          {m.note && <p className="mt-5 rounded-xl border border-foreground/15 p-4 text-sm text-muted-foreground">Note: {m.note}</p>}
          {m.enforcement_note && (
            <p className="mt-3 text-xs text-muted-foreground">India Code enforcement record: {m.enforcement_note}</p>
          )}

          <div className="mt-6 whitespace-pre-line rounded-xl border border-foreground/10 bg-card p-6 font-serif text-[1.05rem] leading-relaxed">
            {doc.body}
          </div>

          <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <dt>Source id</dt>
            <dd className="font-mono">{m.id}</dd>
            <dt>File</dt>
            <dd className="font-mono">{doc.path}</dd>
            <dt>Text fingerprint</dt>
            <dd className="font-mono">{doc.hash.slice(0, 16)}…</dd>
            {m.source_url && (
              <>
                <dt>Official source</dt>
                <dd>
                  <a href={m.source_url} target="_blank" rel="noreferrer noopener" className="underline underline-offset-4">
                    {m.source_url}
                  </a>
                </dd>
              </>
            )}
            {m.scraped_at && (
              <>
                <dt>Scraped</dt>
                <dd>{m.scraped_at}</dd>
              </>
            )}
          </dl>
        </article>

        <aside className="min-w-0 space-y-8 lg:sticky lg:top-6 lg:self-start">
          <section className="rounded-xl border border-foreground/10 bg-card p-5">
            <h2 className="font-serif text-xl">Your decision</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Check the text above against the official source. Your decision applies to answers within a minute.
            </p>
            <ReviewForm
              sourceId={m.id}
              contentHash={doc.hash}
              canSave={!!storeKind}
              nextHref={next ? `/admin/sources/${next.doc.meta.id}` : "/admin"}
            />
          </section>

          <section>
            <h2 className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">History</h2>
            {history.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No decisions yet.</p>
            ) : (
              <ol className="mt-3 space-y-3">
                {history.map((h) => (
                  <li key={h.id} className="rounded-xl border border-foreground/10 p-4 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <StatusBadge status={effectiveStatus({ hash: doc.hash, frontMatterVerified: false }, h)} />
                      <span className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString("en-IN")}</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {h.reviewer} marked it {statusLabel[h.status].toLowerCase()}
                      {h.content_hash !== doc.hash && " (on earlier text)"}
                    </p>
                    {h.note && <p className="mt-2 whitespace-pre-line">{h.note}</p>}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
