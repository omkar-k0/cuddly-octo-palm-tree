import type { Metadata } from "next";
import { Suspense } from "react";
import { ChangePasswordForm, SignOutEverywhere } from "@/components/team/account-forms";
import { RoleBadge } from "@/components/team/badges";
import { countryOf } from "@/components/team/format";
import { requireUser } from "@/lib/accounts/session";

export const metadata: Metadata = { title: "Your account" };

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading account…</p>}>
        <Account />
      </Suspense>
    </div>
  );
}

async function Account() {
  const user = await requireUser();
  return (
    <>
      <h1 className="font-serif text-4xl">Your account</h1>

      <dl className="mt-6 grid gap-px overflow-hidden rounded-xl border border-foreground/10 bg-foreground/10 sm:grid-cols-3">
        <div className="bg-card p-4">
          <dt className="font-mono text-[0.68rem] uppercase tracking-[0.1em] text-muted-foreground">Name</dt>
          <dd className="mt-1 text-sm">{user.name}</dd>
        </div>
        <div className="bg-card p-4">
          <dt className="font-mono text-[0.68rem] uppercase tracking-[0.1em] text-muted-foreground">Email</dt>
          <dd className="mt-1 break-all text-sm">{user.email}</dd>
        </div>
        <div className="bg-card p-4">
          <dt className="font-mono text-[0.68rem] uppercase tracking-[0.1em] text-muted-foreground">Role</dt>
          <dd className="mt-1 flex flex-wrap items-center gap-2 text-sm">
            <RoleBadge role={user.role} />
            {user.role === "lawyer" && <span className="text-muted-foreground">{countryOf(user.country)}</span>}
          </dd>
        </div>
      </dl>

      <section aria-labelledby="change-password" className="mt-10">
        <h2 id="change-password" className="font-serif text-2xl">
          Change password
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Changing your password signs out your other devices.</p>
        <ChangePasswordForm personal={[user.name, user.email.split("@")[0]]} />
      </section>

      <section aria-labelledby="sessions" className="mt-10">
        <h2 id="sessions" className="font-serif text-2xl">
          Sessions
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Lost a device or used a shared computer? This ends every session, including this one.
        </p>
        <SignOutEverywhere />
      </section>
    </>
  );
}
