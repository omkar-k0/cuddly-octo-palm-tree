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

## 2. Add a database for verification decisions

1. In the project: **Storage → Create Database → Neon (Postgres)**, from the
   Marketplace. Free tier is enough.
2. Region: the one closest to Mumbai (the app's functions run in `bom1`,
   Mumbai, set in `vercel.json`).
3. Connect it to the project for **Production** and **Preview**. Vercel adds
   `DATABASE_URL` (and a few other `PG*`/`DATABASE_*` variables) for you.

The table is created automatically the first time a lawyer saves a decision.

## 3. Environment variables

Project → **Settings → Environment Variables**. Add for Production (and
Preview if you want previews to have the dashboard):

| Name | Value | Notes |
|---|---|---|
| `ADMIN_SESSION_SECRET` | output of `npm run -s admin:secret` | 32+ random characters. Changing it signs everyone out. |
| `ADMIN_USERS` | `lawyer@firm.in:scrypt$…` | One `email:hash` per lawyer, comma-separated. Make each hash with `npm run -s admin:hash` and type that lawyer's password (12+ characters). |
| `DATABASE_URL` | set by Neon in step 2 | |
| `ANTHROPIC_API_KEY` | later | Until set, answers are mock and labelled "Mock answer". |

To make hashes on your own machine:

```bash
npm install
```

```bash
npm run -s admin:secret
```

```bash
npm run -s admin:hash
```

Send each lawyer their password over a separate channel. To remove a lawyer,
delete their entry from `ADMIN_USERS` and redeploy; their session stops
working at once.

## 4. Deploy and check

1. **Deployments → Redeploy** (or push to `main`) so the variables apply.
2. Open the production URL:
   - `/` loads, the disclaimer gate appears once.
   - Ask a question on `/ask`: you get an answer marked "Mock answer"
     until the API key is set.
   - `/admin` redirects to `/admin/login`. Sign in as a lawyer, open a
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
