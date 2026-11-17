import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AddMemberForm } from "@/components/team/add-member-form";
import { RoleBadge, UserStatusBadge } from "@/components/team/badges";
import { countryOf, formatWhen } from "@/components/team/format";
import { creatableRoles, listUsers, type User } from "@/lib/accounts";
import { requireUser } from "@/lib/accounts/session";

export const metadata: Metadata = { title: "Members" };

export default function TeamPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading members…</p>}>
        <Members />
      </Suspense>
    </div>
  );
}

async function Members() {
  const me = await requireUser(["owner", "admin"]);
  let users: User[] = [];
  let failed = false;
  try {
    users = await listUsers();
  } catch {
    failed = true;
  }
  const roles = creatableRoles({ id: me.id, role: me.role });

  return (
    <>
      <div>
        <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground">Signed in as {me.email}</p>
        <h1 className="mt-2 font-serif text-4xl">Team</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Owners, admins and the lawyers who review sources. Accounts are created here; each person sets their own password from a one-time link.
        </p>
      </div>

      {failed && (
        <p role="alert" className="mt-6 rounded-xl border border-danger/40 bg-danger-soft p-4 text-sm text-danger">
          The accounts database could not be reached. Members cannot be listed or added right now.
        </p>
      )}

      <div className="mt-8">
        <AddMemberForm roles={roles} />
      </div>

      <div className="mt-8 overflow-x-auto rounded-xl border border-foreground/10">
        <table className="w-full min-w-[760px] text-left text-sm">
          <caption className="sr-only">Team members</caption>
          <thead className="border-b border-foreground/10 font-mono text-[0.68rem] uppercase tracking-[0.1em] text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3 font-normal">Name</th>
              <th scope="col" className="px-4 py-3 font-normal">Email</th>
              <th scope="col" className="px-4 py-3 font-normal">Role</th>
              <th scope="col" className="px-4 py-3 font-normal">Country</th>
              <th scope="col" className="px-4 py-3 font-normal">Status</th>
              <th scope="col" className="px-4 py-3 font-normal">Last login</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/10">
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  No members to show.
                </td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-card">
                <td className="px-4 py-3">
                  <Link href={`/team/members/${u.id}`} className="font-medium underline-offset-4 hover:underline">
                    {u.name}
                  </Link>
                  {u.id === me.id && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                <td className="px-4 py-3">
                  <RoleBadge role={u.role} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">{countryOf(u.country)}</td>
                <td className="px-4 py-3">
                  <UserStatusBadge status={u.status} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">{formatWhen(u.last_login_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{users.length} shown</p>
    </>
  );
}
