"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { Country, Role } from "@/lib/accounts/types";
import { roleLabel } from "./format";
import { SetupLinkBox } from "./setup-link-box";

const field =
  "h-11 w-full rounded-lg border border-foreground/15 bg-card px-3 text-sm focus:border-foreground/50 focus:outline-none";

export function AddMemberForm({ roles }: { roles: Role[] }) {
  const router = useRouter();
  const defaultRole: Role = roles.includes("lawyer") ? "lawyer" : (roles[0] ?? "lawyer");
  const [role, setRole] = React.useState<Role>(defaultRole);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [created, setCreated] = React.useState<{ name: string; url: string } | null>(null);

  if (roles.length === 0) return null;

  return (
    <section aria-labelledby="add-member" className="rounded-xl border border-foreground/10 bg-card/40 p-5">
      <h2 id="add-member" className="font-serif text-2xl">
        Add member
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        This creates the account and a one-time setup link. Send the link to the person yourself; they choose their own password.
      </p>
      <form
        className="mt-5 grid gap-4 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const data = new FormData(form);
          setBusy(true);
          setError(null);
          setCreated(null);
          try {
            const res = await fetch("/api/team/users", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: data.get("name"),
                email: data.get("email"),
                role,
                country: role === "lawyer" ? (data.get("country") as Country) : null,
              }),
            });
            const body = await res.json().catch(() => null);
            if (!res.ok) {
              setError(body?.error ?? "Could not create the account.");
              return;
            }
            setCreated({ name: body.user?.name ?? String(data.get("name")), url: body.setupUrl });
            form.reset();
            setRole(defaultRole);
            router.refresh();
          } catch {
            setError("Could not reach the server. Check your connection and try again.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="block space-y-1.5">
          <span className="text-sm">Name</span>
          <input name="name" required maxLength={120} autoComplete="off" className={field} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm">Email</span>
          <input name="email" type="email" required maxLength={200} autoComplete="off" className={field} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm">Role</span>
          <select name="role" value={role} onChange={(e) => setRole(e.target.value as Role)} className={field}>
            {roles.map((r) => (
              <option key={r} value={r}>
                {roleLabel[r]}
              </option>
            ))}
          </select>
        </label>
        {role === "lawyer" ? (
          <label className="block space-y-1.5">
            <span className="text-sm">
              Country <span className="text-muted-foreground">(required for lawyers)</span>
            </span>
            <select name="country" required defaultValue="" className={field}>
              <option value="" disabled>
                Choose a country
              </option>
              <option value="IN">India</option>
              <option value="DE">Germany</option>
            </select>
          </label>
        ) : (
          <p className="self-end pb-3 text-xs text-muted-foreground">Owners and admins work across all countries.</p>
        )}
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={busy}
            className="h-11 rounded-full bg-accent px-6 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Creating…" : "Create account and link"}
          </button>
        </div>
      </form>

      <div aria-live="polite" className="mt-4 space-y-3">
        {error && (
          <p role="alert" className="rounded-lg border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        {created && (
          <>
            <p className="text-sm text-verified">Account created for {created.name}.</p>
            <SetupLinkBox url={created.url} />
          </>
        )}
      </div>
    </section>
  );
}
