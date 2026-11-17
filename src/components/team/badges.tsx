import type { Role, UserStatus } from "@/lib/accounts/types";
import { cn } from "@/lib/utils";
import { roleLabel, statusLabel } from "./format";

const pill =
  "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 font-mono text-[0.68rem] uppercase tracking-[0.08em]";

const statusStyle: Record<UserStatus, string> = {
  active: "border-verified/40 text-verified",
  invited: "border-accent/40 text-accent",
  suspended: "border-danger/40 text-danger",
};

export function UserStatusBadge({ status, className }: { status: UserStatus; className?: string }) {
  return <span className={cn(pill, statusStyle[status], className)}>{statusLabel[status]}</span>;
}

export function RoleBadge({ role, className }: { role: Role; className?: string }) {
  return (
    <span className={cn(pill, role === "owner" ? "border-accent/40 text-accent" : "border-foreground/20 text-muted-foreground", className)}>
      {roleLabel[role]}
    </span>
  );
}
