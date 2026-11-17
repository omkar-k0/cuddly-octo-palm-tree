import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { getDomain } from "@/config/domains";
import { onboarding } from "@/config/onboarding";
import { requireUser } from "@/lib/accounts/session";
import type { Country } from "@/lib/accounts/types";
import {
  APPLICATION_STATUSES,
  getApplication,
  listApplications,
  OnboardingUnavailable,
  type Application,
  type ApplicationStatus,
} from "@/lib/onboarding/applications";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Applications", robots: { index: false, follow: false } };

type Search = { country?: string; status?: string; id?: string };

const statusLabel: Record<ApplicationStatus, string> = {
  submitted: "Submitted",
  under_review: "Under review",
  approved: "Approved",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};
const statusVariant: Record<ApplicationStatus, "accent" | "default" | "verified" | "warning"> = {
  submitted: "accent",
  under_review: "accent",
  approved: "verified",
  rejected: "warning",
  withdrawn: "default",
};

const when = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
const stamp = (iso: string | null) => (iso ? `${when.format(new Date(iso))} UTC` : "—");

export default function ApplicationsPage({ searchParams }: { searchParams: Promise<Search> }) {
  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading applications…</p>}>
        <Applications searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Applications({ searchParams }: { searchParams: Promise<Search> }) {
  await requireUser(["owner", "admin"]);
  const sp = await searchParams;
  const country = sp.country === "IN" || sp.country === "DE" ? (sp.country as Country) : undefined;
  const status = (APPLICATION_STATUSES as readonly string[]).includes(sp.status ?? "") ? (sp.status as ApplicationStatus) : undefined;

  const href = (over: { country?: Country | null; status?: ApplicationStatus | null; id?: string | null }) => {
    const next = { country, status, id: sp.id, ...over };
    const p = new URLSearchParams();
    if (next.country) p.set("country", next.country);
    if (next.status) p.set("status", next.status);
    if (next.id) p.set("id", next.id);
    const s = p.toString();
    return s ? `/team/applications?${s}` : "/team/applications";
  };

  let rows: Application[] = [];
  let selected: Application | null = null;
  let problem: string | null = null;
  try {
    rows = await listApplications({ country, status });
    if (sp.id) selected = rows.find((a) => a.id === sp.id) ?? (await getApplication(sp.id));
  } catch (e) {
    problem =
      e instanceof OnboardingUnavailable
        ? "No database is configured (set DATABASE_URL), so applications cannot be shown or received."
        : "Applications could not be loaded. Try again in a moment.";
    if (!(e instanceof OnboardingUnavailable)) console.error(`[applications] load failed: ${(e as Error).name}`);
  }

  return (
    <>
      <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground">Lawyer onboarding</p>
      <h1 className="mt-2 font-serif text-4xl">Applications</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Lawyers who applied at <code className="font-mono">/lawyers/join</code>. Newest first.
      </p>

      <p className="mt-6 rounded-xl border border-foreground/15 p-4 text-sm text-muted-foreground">
        Decisions (approve/reject) arrive in step 3. For now this list is read-only.
      </p>

      {problem && (
        <p role="alert" className="mt-6 rounded-xl border border-danger/40 bg-danger-soft p-4 text-sm text-danger">
          {problem}
        </p>
      )}

      <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-8">
        <FilterNav label="Country" current={country ?? null} all="All countries" items={(Object.keys(onboarding) as Country[]).map((c) => ({ key: c, label: onboarding[c].label, href: href({ country: c, id: null }) }))} allHref={href({ country: null, id: null })} />
        <FilterNav label="Status" current={status ?? null} all="All statuses" items={APPLICATION_STATUSES.map((s) => ({ key: s, label: statusLabel[s], href: href({ status: s, id: null }) }))} allHref={href({ status: null, id: null })} />
      </div>

      {selected && <Detail application={selected} closeHref={href({ id: null })} />}

      <div className="mt-6 overflow-x-auto rounded-xl border border-foreground/10">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-foreground/10 font-mono text-[0.68rem] uppercase tracking-[0.1em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-normal">Applicant</th>
              <th className="px-4 py-3 font-normal">Country</th>
              <th className="px-4 py-3 font-normal">Bar body</th>
              <th className="px-4 py-3 font-normal">Enrolled</th>
              <th className="px-4 py-3 font-normal">Status</th>
              <th className="px-4 py-3 font-normal">Submitted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/10">
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  {problem ? "Nothing to show." : country || status ? "No applications match these filters." : "No applications yet."}
                </td>
              </tr>
            )}
            {rows.map((a) => (
              <tr key={a.id} className={cn("hover:bg-card", selected?.id === a.id && "bg-card")}>
                <td className="px-4 py-3">
                  <Link href={href({ id: a.id })} scroll={false} className="block font-medium underline-offset-4 hover:underline" aria-label={`Show details for ${a.full_name}`}>
                    {a.full_name}
                    <span className="block text-xs font-normal text-muted-foreground">{a.email}</span>
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{a.country}</td>
                <td className="px-4 py-3 text-muted-foreground">{a.bar_body}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{enrolled(a)}</td>
                <td className="px-4 py-3">
                  <Badge variant={statusVariant[a.status]}>{statusLabel[a.status]}</Badge>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{stamp(a.submitted_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{rows.length} shown</p>
    </>
  );
}

const enrolled = (a: Application) => (a.country === "IN" ? a.enrolment_date.slice(0, 4) : a.enrolment_date);

function FilterNav({
  label,
  current,
  all,
  items,
  allHref,
}: {
  label: string;
  current: string | null;
  all: string;
  items: { key: string; label: string; href: string }[];
  allHref: string;
}) {
  const pill = (active: boolean) =>
    cn(
      "rounded-full border px-3 py-1 text-xs transition-colors",
      active ? "border-accent bg-accent text-accent-foreground" : "border-foreground/15 text-muted-foreground hover:text-foreground",
    );
  return (
    <nav aria-label={`Filter by ${label.toLowerCase()}`} className="flex flex-wrap items-center gap-2">
      <span className="mr-1 font-mono text-[0.68rem] uppercase tracking-[0.1em] text-muted-foreground">{label}</span>
      <Link href={allHref} aria-current={current === null ? "page" : undefined} className={pill(current === null)}>
        {all}
      </Link>
      {items.map((i) => (
        <Link key={i.key} href={i.href} aria-current={current === i.key ? "page" : undefined} className={pill(current === i.key)}>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

function Detail({ application: a, closeHref }: { application: Application; closeHref: string }) {
  const domainTitles = a.areas.map((id) => getDomain(id)?.title ?? id);
  const rows: [string, React.ReactNode][] = [
    ["Application id", <code key="id" className="font-mono text-xs">{a.id}</code>],
    ["Country", onboarding[a.country].label],
    ["Status", statusLabel[a.status]],
    ["Full name", a.full_name],
    ["Email", a.email],
    ["Phone", a.phone],
    [onboarding[a.country].bodyLabel, a.bar_body],
    ...(a.country === "IN" ? ([["Enrolment number", a.enrolment_number ?? "—"]] as [string, React.ReactNode][]) : []),
    [a.country === "IN" ? "Year of enrolment" : "Date of admission", enrolled(a)],
    ["Areas", domainTitles.join(", ") || "—"],
    [a.country === "IN" ? "States and Union Territories" : "Länder", a.jurisdictions.join(", ") || "—"],
    ["Languages", a.languages.join(", ") || "—"],
    ["Documents", a.documents.length ? `${a.documents.length} on file` : "None yet"],
    ["Consent", `Privacy section ${a.consent_privacy_version}, ${stamp(a.consented_at)}`],
    ["Submitted", stamp(a.submitted_at)],
    ["Decided", a.decided_at ? `${stamp(a.decided_at)}${a.decided_by ? ` by ${a.decided_by}` : ""}` : "—"],
    ["Decision reason", a.decision_reason ?? "—"],
    ["Notes", a.notes.length ? a.notes.map((n) => `${stamp(n.at)}: ${n.text}`).join("\n") : "None"],
  ];
  return (
    <section aria-label="Application details" className="mt-6 rounded-xl border border-foreground/15 bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-serif text-2xl">{a.full_name}</h2>
        <Link href={closeHref} scroll={false} className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">
          Close
        </Link>
      </div>
      <dl className="mt-4 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-[14rem_1fr]">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="font-mono text-[0.68rem] uppercase tracking-[0.1em] text-muted-foreground sm:pt-0.5">{k}</dt>
            <dd className="whitespace-pre-line break-words">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
