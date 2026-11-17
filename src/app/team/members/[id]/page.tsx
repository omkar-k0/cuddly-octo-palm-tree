import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AuditTable } from "@/components/team/audit-table";
import { RoleBadge, UserStatusBadge } from "@/components/team/badges";
import { countryOf, formatWhen } from "@/components/team/format";
import { MemberActions } from "@/components/team/member-actions";
import { canManage, getUser, listAudit, type AuditEntry, type User } from "@/lib/accounts";
import { requireUser } from "@/lib/accounts/session";

export const metadata: Metadata = { title: "Member" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading member…</p>}>
        <Member params={params} />
      </Suspense>
    </div>
  );
}

async function Member({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser(["owner", "admin"]);
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  let target: User | null = null;
  let audit: AuditEntry[] = [];
  let failed = false;
  try {
    target = await getUser(id);
    if (target) audit = await listAudit({ targetId: id, limit: 100 });
  } catch {
    failed = true;
  }
  if (failed) {
    return (
      <p role="alert" className="rounded-xl border border-danger/40 bg-danger-soft p-4 text-sm text-danger">
        The accounts database could not be reached. Try again shortly.
      </p>
    );
  }
  if (!target) notFound();

  const isSelf = target.id === me.id;
  const manage = canManage({ id: me.id, role: me.role }, target);

  return (
    <>
      <Link href="/team" className="text-sm text-muted-foreground hover:text-foreground">
        ← All members
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-4xl">{target.name}</h1>
        <RoleBadge role={target.role} />
        <UserStatusBadge status={target.status} />
      </div>

      <dl className="mt-6 grid gap-px overflow-hidden rounded-xl border border-foreground/10 bg-foreground/10 sm:grid-cols-2">
        {[
          ["Email", target.email],
          ["Country", countryOf(target.country)],
          ["Created", formatWhen(target.created_at)],
          ["Last login", formatWhen(target.last_login_at)],
        ].map(([k, v]) => (
          <div key={k} className="bg-card p-4">
            <dt className="font-mono text-[0.68rem] uppercase tracking-[0.1em] text-muted-foreground">{k}</dt>
            <dd className="mt-1 text-sm">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8">
        {isSelf ? (
          <p className="text-sm text-muted-foreground">
            This is your own account. Change your password or sign out of other devices on the{" "}
            <Link href="/account" className="underline underline-offset-4">
              account page
            </Link>
            .
          </p>
        ) : manage ? (
          <MemberActions id={target.id} name={target.name} status={target.status} />
        ) : (
          <p className="text-sm text-muted-foreground">You cannot manage this account.</p>
        )}
      </div>

      <h2 className="mt-10 font-serif text-2xl">History</h2>
      <p className="mt-1 mb-4 text-sm text-muted-foreground">Everything recorded about this account, newest first.</p>
      <AuditTable entries={audit} showTarget={false} />
    </>
  );
}
