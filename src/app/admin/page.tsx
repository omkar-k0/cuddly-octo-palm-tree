import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SignOut } from "@/components/admin/sign-out";
import { StatusBadge, statusLabel } from "@/components/admin/status-badge";
import { domains } from "@/config/domains";
import { loadCatalog, progressByDomain } from "@/lib/admin/catalog";
import { requireSession } from "@/lib/admin/session";
import type { EffectiveStatus } from "@/lib/admin/store";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Sources" };

type Search = { status?: string; domain?: string; q?: string };

export default function AdminHome({ searchParams }: { searchParams: Promise<Search> }) {
  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading sources…</p>}>
        <Dashboard searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const FILTERS: (EffectiveStatus | "all" | "todo")[] = ["todo", "all", "unverified", "stale", "needs_changes", "verified", "rejected"];
const filterLabel = (f: (typeof FILTERS)[number]) => (f === "all" ? "All" : f === "todo" ? "To review" : statusLabel[f]);

async function Dashboard({ searchParams }: { searchParams: Promise<Search> }) {
  const session = await requireSession();
  const sp = await searchParams;
  const { entries, storeKind, storeError } = await loadCatalog();
  const progress = progressByDomain(entries);
  const status = (FILTERS as string[]).includes(sp.status ?? "") ? (sp.status as (typeof FILTERS)[number]) : "todo";
  const domain = domains.find((d) => d.id === sp.domain)?.id;
  const q = (sp.q ?? "").trim().toLowerCase();

  const rows = entries
    .filter((e) =>
      status === "all" ? true : status === "todo" ? ["unverified", "stale", "needs_changes"].includes(e.status) : e.status === status,
    )
    .filter((e) => !domain || e.doc.domain === domain)
    .filter((e) => !q || [e.doc.meta.title, e.doc.meta.act, e.doc.meta.section, e.doc.meta.id].join(" ").toLowerCase().includes(q))
    .sort((a, b) => a.doc.domain.localeCompare(b.doc.domain) || a.doc.meta.id.localeCompare(b.doc.meta.id, undefined, { numeric: true }));

  const total = entries.length;
  const verified = entries.filter((e) => e.status === "verified").length;
  const href = (over: Partial<Search>) => {
    const p = new URLSearchParams();
    const next = { status, domain, q: sp.q, ...over };
    if (next.status && next.status !== "todo") p.set("status", next.status);
    if (next.domain) p.set("domain", next.domain);
    if (next.q) p.set("q", next.q);
    const s = p.toString();
    return s ? `/admin?${s}` : "/admin";
  };

  return (
    <>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground">Signed in as {session.email}</p>
          <h1 className="mt-2 font-serif text-4xl">Source verification</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {verified} of {total} sources verified. Answers show &ldquo;Verified&rdquo; only for these; rejected sources
            are never used.
          </p>
        </div>
        <SignOut />
      </div>

      {!storeKind && (
        <p role="alert" className="mt-6 rounded-xl border border-danger/40 bg-danger-soft p-4 text-sm text-danger">
          {storeError
            ? `The verification database could not be reached (${storeError}). Decisions cannot be saved right now.`
            : "No verification database is configured (set DATABASE_URL). You can read sources, but decisions cannot be saved."}
        </p>
      )}

      <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-foreground/10 bg-foreground/10 sm:grid-cols-2 lg:grid-cols-4">
        {progress.map((p) => (
          <Link key={p.domain.id} href={href({ domain: domain === p.domain.id ? undefined : p.domain.id })} className={cn("bg-card p-5 transition-colors hover:bg-muted", domain === p.domain.id && "bg-muted")}>
            <p className="font-mono text-xs text-accent">{p.domain.number}</p>
            <p className="mt-1 font-serif text-xl">{p.domain.title}</p>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-background">
              <div className="h-full rounded-full bg-verified" style={{ width: `${p.total ? (100 * p.verified) / p.total : 0}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {p.verified}/{p.total} verified{p.attention ? ` · ${p.attention} need attention` : ""}
              {p.rejected ? ` · ${p.rejected} rejected` : ""}
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Link
              key={f}
              href={href({ status: f })}
              aria-current={status === f ? "page" : undefined}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                status === f ? "border-accent bg-accent text-accent-foreground" : "border-foreground/15 text-muted-foreground hover:text-foreground",
              )}
            >
              {filterLabel(f)}
            </Link>
          ))}
        </nav>
        <form action="/admin" className="flex gap-2">
          {status !== "todo" && <input type="hidden" name="status" value={status} />}
          {domain && <input type="hidden" name="domain" value={domain} />}
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Search act, section, title"
            className="h-9 w-64 rounded-full border border-foreground/15 bg-card px-4 text-sm focus:border-foreground/50 focus:outline-none"
          />
        </form>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-foreground/10">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-foreground/10 font-mono text-[0.68rem] uppercase tracking-[0.1em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-normal">Source</th>
              <th className="px-4 py-3 font-normal">Area</th>
              <th className="px-4 py-3 font-normal">Applies</th>
              <th className="px-4 py-3 font-normal">Status</th>
              <th className="px-4 py-3 font-normal">Last decision</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/10">
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  Nothing here. {status === "todo" ? "Every source has been reviewed." : "Try another filter."}
                </td>
              </tr>
            )}
            {rows.map((e) => {
              const m = e.doc.meta;
              const where = m.jurisdiction === "central" ? "All India" : m.local ? `${m.local}, ${m.state}` : m.state;
              const when = m.effective_from ? `from ${m.effective_from}` : m.effective_until ? `until ${m.effective_until}` : "";
              return (
                <tr key={m.id} className="hover:bg-card">
                  <td className="px-4 py-3">
                    <Link href={`/admin/sources/${m.id}`} className="block">
                      <span className="font-medium">{[m.section, m.act ?? m.case].filter(Boolean).join(", ")}</span>
                      <span className="block text-muted-foreground">{m.title}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{domains.find((d) => d.id === e.doc.domain)?.title}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {where}
                    {when && <span className="block">{when}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={e.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {e.latest ? (
                      <>
                        {e.latest.reviewer}
                        <span className="block">{new Date(e.latest.created_at).toLocaleDateString("en-IN")}</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{rows.length} shown</p>
    </>
  );
}
