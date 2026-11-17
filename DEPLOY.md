# Going live on Vercel

About 15 minutes. You need a Vercel account with access to the GitHub repo
`omkar-k0/cuddly-octo-palm-tree`.

## 1. Import the repo

1. Go to vercel.com → **Add New… → Project**.
2. Pick `omkar-k0/cuddly-octo-palm-tree` (grant the Vercel GitHub app access
   to it if it is not listed).
3. Framework preset: **Next.js** (detected). Root directory: `./`. Leave the
   build and output settings as they are.
4. Do not deploy yet if you want the dashboard on the first deploy: add the
   environment variables in step 3 first. (Deploying now is fine too; the
   public site works without any variables.)

After this, every push to `main` deploys to production and every pull
request gets a preview URL.

## 2. Add a database for accounts and verification decisions

1. In the project: **Storage → Create Database → Neon (Postgres)**, from the
   Marketplace. Free tier is enough.
2. Region: the one closest to Mumbai (the app's functions run in `bom1`,
   Mumbai, set in `vercel.json`).
3. Connect it to the project for **Production** and **Preview**. Vercel adds
   `DATABASE_URL` (and a few other `PG*`/`DATABASE_*` variables) for you.

`DATABASE_URL` is required on Vercel. It holds the team and lawyer
accounts, sessions, the audit log, lawyer applications and verification
decisions. The tables are created automatically on first use.

## 3. Environment variables

Project → **Settings → Environment Variables**. Add for Production (and
Preview if you want previews to have the dashboard):

| Name | Value | Notes |
|---|---|---|
| `ADMIN_USERS` | `you@firm.in:scrypt$…` | Only for the first owner. One `email:hash` per owner, comma-separated. Make each hash with `npm run -s admin:hash` and type that person's password (12+ characters). |
| `DATABASE_URL` | set by Neon in step 2 | Required. |
| `ANTHROPIC_API_KEY` | later | Until set, answers are mock and labelled "Mock answer". |

`ADMIN_SESSION_SECRET` is no longer needed. If it is set in Vercel, delete it.

To make a hash on your own machine:

```bash
npm install
```

```bash
npm run -s admin:hash
```

### Team and lawyer accounts

`ADMIN_USERS` creates the first owner when that person first signs in to an
empty database. After that, the variable is not used again, and you manage
everyone in the app.

To add a team admin or a lawyer:

1. Sign in at `/admin/login` and open `/team`.
2. Click **Add member**, fill in the details, and save.
3. Copy the one-time setup link and send it to the person privately (not in
   a public channel). It is valid for 72 hours and works once. They choose
   their own password.

On a member's page in `/team`:

- **Suspend** stops them signing in and signs them out at once. **Reactivate**
  undoes it. The last active owner cannot be suspended.
- **New setup link** issues a fresh link (for a lost link or a password
  reset). Earlier links stop working.
- **Sign out everywhere** ends all of that person's sessions without
  suspending them.

Lawyers who apply at `/lawyers/join` appear in `/team/applications`.

**After this deploy, everyone must sign in again.** The old session cookies
stop working.

## 4. Deploy and check

1. **Deployments → Redeploy** (or push to `main`) so the variables apply.
2. Open the production URL:
   - `/` loads, the disclaimer gate appears once.
   - Ask a question on `/ask`: you get an answer marked "Mock answer"
     until the API key is set.
   - `/admin` redirects to `/admin/login`. Sign in as the owner, open a
     source, mark it Verified. The banner at the top must **not** say "No
     verification database is configured".
   - Ask a question that cites that source: its citation now shows
     "Verified" (allow up to a minute).

## 5. When the API key arrives

Add `ANTHROPIC_API_KEY` in Settings → Environment Variables and redeploy.
Then run the live eval locally and commit the README table:

```bash
ANTHROPIC_API_KEY=… npm run eval -- --mode live --write-readme
```

## Notes

- **Search engines.** Pages send `noindex` (set in `src/app/layout.tsx`), so
  the site is public to anyone with the link but not listed in Google until
  the sources are verified. Remove the `robots` line there when you want it
  indexed.
- **Custom domain.** Project → Settings → Domains.
- **Logs.** The app never logs question or answer text; Vercel's request logs
  contain URLs and IPs only.
- **Privacy notice.** Fill the bracketed placeholders in `/privacy` and
  `/terms` (entity, grievance officer, hosting provider: Vercel Inc., log
  retention) before promoting the site.
