# Lawyer onboarding: step 1 plan (and step 2 framework)

Owner decisions (17 Nov 2026):

- Lawyers apply publicly, the team verifies them, approved lawyers accept a
  reviewer agreement and then review sources (the law). Same flow for India
  and Germany.
- Reviewers may be paid or unpaid later; for now, reviews only.
- Reviewers are anonymous in public for now. A config toggle allows naming
  them later (`src/config/reviewers.ts`).
- Team: just the owner now, but the owner must be able to add more team
  members by creating credentials for them.
- No two-factor login yet (future scope). No email provider yet: the
  owner shares one-time setup links by hand.

## Step 1 scope (this session)

Real accounts in the database, replacing the `ADMIN_USERS` environment
logins.

| Area | What |
|---|---|
| Database | One entry point (`@/lib/db`): Postgres via `DATABASE_URL`; PGlite locally; versioned migrations |
| Tables | `users`, `sessions` (hashed tokens), `account_tokens` (one-time setup/reset links, hashed), `audit_log`; `source_verifications` moves into migrations and gains `reviewer_user_id` |
| Roles | `owner` (manages everyone), `admin` (team; manages lawyers), `lawyer` (reviews sources) |
| Auth | Email + password (scrypt), DB sessions (revocable, 12h), login throttle, same-origin checks |
| Migration of current logins | On first run with an empty `users` table, each `ADMIN_USERS` entry becomes an active `owner` (password hash carried over) |
| Team dashboard `/team` | Members list, add member (role, country for lawyers) → copyable one-time setup link, suspend/reactivate, new setup link, sign out everywhere, audit log |
| Account | `/account/setup?token=…` (set password), `/account` (change password, sign out everywhere) |
| Lawyer dashboard | Existing `/admin`, now any signed-in role; decisions record `reviewer_user_id` |

## Step 2 framework (this session)

Scaffolding for the public application, completed in step 2 proper:

- `lawyer_applications` table (migration 003), country-specific application
  schemas (India: State Bar Council, enrolment number, year; Germany:
  Rechtsanwaltskammer, admission date), document storage interface with a
  local adapter (Vercel Blob adapter later).
- `/lawyers/join` page and `POST /api/lawyers/apply` that validate and store
  an application (documents optional until storage is chosen).
- `/team/applications`: read-only list for the team (decisions come in step 3).
- Reviewer attribution toggle (`anonymous` | `named`).

## Work split (parallel workers, separate git worktrees)

Shared contracts are committed first:
`src/lib/db/index.ts`, `src/lib/accounts/{index,types,session}.ts`,
`src/lib/db/migrations/003_lawyer_applications.ts`. Workers code against
them; Worker A replaces the placeholder bodies.

| Worker | Owns (may create/edit) | Must not edit |
|---|---|---|
| **A: data and auth** | `src/lib/db/**` (except 003 body), `src/lib/accounts/**`, `src/lib/admin/{auth,session,store}.ts`, `src/proxy.ts`, `src/app/api/admin/{login,logout,verify}/route.ts`, `src/app/admin/page.tsx` and `src/app/admin/sources/[id]/page.tsx` (only the session lines), `next.config.ts`, `package.json`, tests for these | `src/app/team/**`, `src/app/account/**`, onboarding files |
| **B: team and account UI** | `src/app/team/**` (except `applications/`), `src/app/account/**`, `src/app/api/team/**`, `src/app/api/account/**`, `src/components/team/**`, a "Team" link in `src/app/admin/layout.tsx` | `src/lib/**`, `src/proxy.ts` |
| **C: onboarding framework and attribution** | `src/config/{onboarding,reviewers}.ts`, `src/lib/onboarding/**`, `src/lib/db/migrations/003_lawyer_applications.ts` (body), `src/app/(site)/lawyers/**`, `src/app/api/lawyers/**`, `src/app/team/applications/**`, footer link in `src/components/site-footer.tsx`, reviewer label plumbing in `src/lib/pipeline/{types,gate}.ts` and `src/components/answer-view.tsx` | `src/lib/accounts/**`, `src/lib/db/index.ts`, `src/proxy.ts` |

Route protection (`src/proxy.ts`, Worker A): gate `/admin/**`, `/team/**`,
`/account/**`, `/api/admin/**`, `/api/team/**`, `/api/account/**` on the
presence of a well-formed session cookie (optimistic); open paths:
`/admin/login`, `/api/admin/login`, `/account/setup`, `/api/account/setup`.
Every page and handler checks the session and role itself.

## Definition of done

- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` clean.
- Fresh database: owner from `ADMIN_USERS` signs in; creates an admin and a
  lawyer; each completes setup from the link and signs in; admin cannot
  create admins; suspending ends sessions at once; the last owner cannot be
  suspended; audit log shows each action.
- Existing verification flow unchanged for signed-in users.
- An application can be submitted at `/lawyers/join` and seen at
  `/team/applications`.

## Status

Step 1 is done. The step 2 framework is in place: the application page,
the API, the `lawyer_applications` table and the read-only applications
list. Decisions on applications, document upload and the reviewer agreement
are still to come (see the roadmap).

Deviations from the plan:

- `src/lib/db` has extra exports: `getDriver`, `withTransaction` and
  `driverFromRunner`.
- `changePassword` has an optional fourth parameter, `keepSessionId`. The
  password route passes the requester's session id. Without it, all sessions
  are revoked.
- The rules for who may revoke sessions and who may issue setup links are
  enforced inside the accounts service, not only in the routes.
- Worker C added a type-only `reviewed_by` field in
  `src/lib/retrieval/types.ts`. Nothing sets or reads it yet.
- A duplicate open application now returns 201 `{ ok: true }`, the same as a
  new one, so the endpoint does not reveal whether an email has applied.
  The database's partial unique index still prevents duplicates.
- The per-IP sign-in limit is 30 failures per 15 minutes. The per-email
  limit stays at 5.
