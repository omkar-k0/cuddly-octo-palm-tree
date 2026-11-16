import type { EffectiveStatus } from "@/lib/admin/store";
import { cn } from "@/lib/utils";

export const statusLabel: Record<EffectiveStatus, string> = {
  verified: "Verified",
  unverified: "Unverified",
  needs_changes: "Needs changes",
  rejected: "Rejected",
  stale: "Text changed",
};

const styles: Record<EffectiveStatus, string> = {
  verified: "border-verified/40 text-verified",
  unverified: "border-foreground/20 text-muted-foreground",
  needs_changes: "border-accent/40 text-accent",
  rejected: "border-danger/40 text-danger",
  stale: "border-accent/40 text-accent",
};

export function StatusBadge({ status, className }: { status: EffectiveStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 font-mono text-[0.68rem] uppercase tracking-[0.08em]",
        styles[status],
        className,
      )}
    >
      {statusLabel[status]}
    </span>
  );
}
