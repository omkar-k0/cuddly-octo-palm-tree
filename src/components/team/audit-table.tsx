import Link from "next/link";
import type { AuditEntry } from "@/lib/accounts/types";
import { formatWhen, summarizeDetails } from "./format";

/**
 * Audit entries, newest first. `names` maps user ids to a readable label so
 * targets show a name instead of a uuid; unknown ids fall back to a short id.
 */
export function AuditTable({
  entries,
  names = {},
  showTarget = true,
}: {
  entries: AuditEntry[];
  names?: Record<string, string>;
  showTarget?: boolean;
}) {
  const cols = showTarget ? 5 : 4;
  return (
    <div className="overflow-x-auto rounded-xl border border-foreground/10">
      <table className="w-full min-w-[720px] text-left text-sm">
        <caption className="sr-only">Audit log, newest first</caption>
        <thead className="border-b border-foreground/10 font-mono text-[0.68rem] uppercase tracking-[0.1em] text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-3 font-normal">When</th>
            <th scope="col" className="px-4 py-3 font-normal">Who</th>
            <th scope="col" className="px-4 py-3 font-normal">Action</th>
            {showTarget && <th scope="col" className="px-4 py-3 font-normal">Target</th>}
            <th scope="col" className="px-4 py-3 font-normal">Details</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-foreground/10">
          {entries.length === 0 && (
            <tr>
              <td colSpan={cols} className="px-4 py-10 text-center text-muted-foreground">
                Nothing recorded yet.
              </td>
            </tr>
          )}
          {entries.map((e) => (
            <tr key={e.id} className="align-top hover:bg-card">
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">
                <time dateTime={e.created_at}>{formatWhen(e.created_at)}</time>
              </td>
              <td className="px-4 py-3">{e.actor_email ?? <span className="text-muted-foreground">System</span>}</td>
              <td className="px-4 py-3 font-mono text-xs">{e.action}</td>
              {showTarget && (
                <td className="px-4 py-3">
                  <Target entry={e} names={names} />
                </td>
              )}
              <td className="px-4 py-3 text-xs text-muted-foreground">{summarizeDetails(e.details) || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Target({ entry, names }: { entry: AuditEntry; names: Record<string, string> }) {
  if (!entry.target_id) return <span className="text-muted-foreground">—</span>;
  const label = names[entry.target_id] ?? `${entry.target_type ?? "item"} ${entry.target_id.slice(0, 8)}`;
  if (entry.target_type === "user" && names[entry.target_id]) {
    return (
      <Link href={`/team/members/${entry.target_id}`} className="underline-offset-4 hover:underline">
        {label}
      </Link>
    );
  }
  return <span className="text-muted-foreground">{label}</span>;
}
