import type { AuditEntry, Country, Role, UserStatus } from "@/lib/accounts/types";

export const roleLabel: Record<Role, string> = { owner: "Owner", admin: "Admin", lawyer: "Lawyer" };
export const statusLabel: Record<UserStatus, string> = { invited: "Invited", active: "Active", suspended: "Suspended" };
export const countryLabel: Record<Country, string> = { IN: "India", DE: "Germany" };

export const countryOf = (c: Country | null) => (c ? countryLabel[c] : "All");

/** "2026-11-17 12:48 UTC". Audit logs read best in one fixed zone. */
export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return `${d.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

const SECRET_KEY = /token|password|secret|hash|cookie/i;

/** One-line summary of an audit entry's details. Anything secret-looking is left out. */
export function summarizeDetails(details: AuditEntry["details"] | null | undefined, max = 140): string {
  if (!details || typeof details !== "object") return "";
  const parts: string[] = [];
  for (const [key, value] of Object.entries(details)) {
    if (SECRET_KEY.test(key) || value === null || value === undefined || value === "") continue;
    const text = typeof value === "object" ? JSON.stringify(value) : String(value);
    parts.push(`${key}: ${text}`);
  }
  const out = parts.join(", ");
  return out.length > max ? `${out.slice(0, max - 1)}…` : out;
}
