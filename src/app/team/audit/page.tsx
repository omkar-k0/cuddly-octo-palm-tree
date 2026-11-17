import type { Metadata } from "next";
import { Suspense } from "react";
import { AuditTable } from "@/components/team/audit-table";
import { listAudit, listUsers, type AuditEntry } from "@/lib/accounts";
import { requireUser } from "@/lib/accounts/session";

export const metadata: Metadata = { title: "Audit log" };

const LIMIT = 200;

export default function AuditPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading audit log…</p>}>
        <Audit />
      </Suspense>
    </div>
  );
}

async function Audit() {
  await requireUser(["owner", "admin"]);
  let entries: AuditEntry[] = [];
  const names: Record<string, string> = {};
  let failed = false;
  try {
    entries = await listAudit({ limit: LIMIT });
    for (const u of await listUsers()) names[u.id] = u.name;
  } catch {
    failed = true;
  }

  return (
    <>
      <h1 className="font-serif text-4xl">Audit log</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The last {LIMIT} recorded actions, newest first. Times are in UTC.
      </p>
      {failed && (
        <p role="alert" className="mt-6 rounded-xl border border-danger/40 bg-danger-soft p-4 text-sm text-danger">
          The accounts database could not be reached, so the log may be incomplete.
        </p>
      )}
      <div className="mt-6">
        <AuditTable entries={entries} names={names} />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{entries.length} shown</p>
    </>
  );
}
