# Nyaya Notes (working title)

Legal first information for India. A person describes a problem in plain
language and gets a structured, cited explanation of where they stand under
Indian law, plus a clear signal when to see an advocate. **Legal
information, not legal advice**, and every answer says so.

V0 status: all four domains have sources scraped from India Code; the law is
chosen by when the events happened and where. Not done until the live eval
runs (needs an API key) and a lawyer reviews sources, eval labels and the
legal pages. Plan in [PLAN.md](PLAN.md), open
questions in [QUESTIONS.md](QUESTIONS.md).

## Eval

<!-- EVAL:START -->
> **Mock baseline, not a quality result.** Keyword classifier and template answers stand in for the models; retrieval, rules and the gate are real. The live run replaces this table once an API key is set.

Run: 2026-11-15, mock mode, 30 questions (`questions.jsonl`)

| Metric | Result |
|---|---|
| Routing accuracy | 96.7% (29/30) |
| Citation presence (answered with ≥1 valid citation) | 100.0% (26/26) |
| In-scope questions given a cited answer | 100.0% (26/26) |
| Expected source retrieved (recall@k) | 90.0% (18/20) |
| Expected-citation hit rate | 70.0% (14/20) |
| Escalation agreement | 90.0% (27/30) |
| Auto-handled (answered, not escalated) | 63.3% (19/30) |
| Overall accuracy | 70.0% (21/30) |

| Confidence band | Questions | Accuracy |
|---|---|---|
| Low (0.0–0.4) | 4 | 100.0% (4/4) |
| Guarded (0.4–0.6) | 0 | n/a |
| Moderate (0.6–0.8) | 5 | 20.0% (1/5) |
| High (0.8–1.0) | 21 | 76.2% (16/21) |
<!-- EVAL:END -->

## Lawyer verification dashboard

`/admin` (sign-in required) lists every source with per-area progress.
A lawyer opens a source, checks it against the official link, and marks it
**Verified**, **Needs changes** or **Rejected** (a note is required for the
last two). Effects on answers, within a minute:

- Verified sources show "Verified" in citations.
- Rejected sources are never retrieved.
- Each decision records the reviewer, time and a fingerprint of the exact
  text reviewed. If the text later changes (e.g. after a re-scrape), the
  source shows "Text changed" and counts as unverified until reviewed again.

Decisions are an append-only log in Postgres (`DATABASE_URL`), or
`.data/verifications.json` locally. Accounts come from `ADMIN_USERS`
(email plus scrypt hash, `npm run -s admin:hash`) and sessions are signed
with `ADMIN_SESSION_SECRET`. See [DEPLOY.md](DEPLOY.md).

## Run it

```bash
npm install
cp .env.example .env.local    # add ANTHROPIC_API_KEY for live answers
npm run dev                   # http://localhost:3000
```

Without `ANTHROPIC_API_KEY` the app runs in **mock mode**: a keyword
classifier and a template answer built from the retrieved sources stand in
for the two model calls, and the UI labels the answer "Mock". Retrieval, PII
scrubbing and the confidence gate are the same in both modes.

```bash
npm test            # unit tests (scrubber, signals, gate, retrieval, mock pipeline)
npm run typecheck
npm run lint
npm run eval        # see eval/README.md
NODE_USE_ENV_PROXY=1 npm run scrape   # refresh sources from India Code (proxy flag only needed behind a proxy)
```

Deploy on Vercel: follow [DEPLOY.md](DEPLOY.md) (import the repo, add Neon
Postgres, set the admin variables). `next.config.ts` bundles `prompts/` and
`sources/` with the routes that read them.

## How an answer is made

```
question → PII scrub → classifier (claude-haiku-5-5): domain, criminal, deadline, date, place, search terms
         → retrieve from sources/<domain>/, only law that applies to that date and place
         → answerer (claude-opus-5-5, JSON only) → confidence gate → answer
```

| Step | File |
|---|---|
| Domain taxonomy (edit here) | `src/config/domains.ts` |
| Models, effort | `src/config/models.ts` |
| Thresholds (confidence 0.6, deadline < 7 days) | `src/config/gating.ts` |
| PII scrubber | `src/lib/privacy/scrub.ts` |
| Retrieval interface and BM25 file retriever | `src/lib/retrieval/` |
| Classifier, answerer, gate, orchestration | `src/lib/pipeline/` |
| Prompts (shared + one per domain) | `prompts/` |
| Source documents | `sources/`, see [sources/README.md](sources/README.md) |
| Scraper (India Code) | `scripts/scrape/` (manifest of Acts and sections) |
| Date and place logic | `src/lib/pipeline/context.ts`, `src/config/jurisdictions.ts` |
| API | `src/app/api/answer/route.ts` |

**Gate rules** (server-side, after every answer):

- Citations must point at a passage that was actually retrieved; anything
  else is dropped. The act, section or case shown to the user comes from the
  source file's front-matter, never from the model's text.
- No valid citation → status `unverifiable`, the summary says so, confidence
  capped at 0.3. No retrieved passage → the answer model is not called.
- `escalate` is true for criminal matters, deadlines under 7 days, or
  confidence below 0.6. Criminal and deadline signals come from the
  classifier **and** deterministic rules (either one triggers).

**Which law applies.** Sources carry jurisdiction (central, state, local)
and effective dates. Events before 21 Nov 2025 get the old labour Acts;
later ones get the Labour Codes. State tenancy law (Delhi, Maharashtra so
far) applies only in that state. If the date or state is unknown and would
change the answer, the response says so in `missing_context` and the page
asks for it.

Answer JSON: `status, domain, summary, steps, citations[{act, section, case,
jurisdiction, state, effective_from, effective_until, …, verified}],
confidence, escalate, escalation_reasons, follow_ups, context,
missing_context, redactions, disclaimer, mode`. Type in
`src/lib/pipeline/types.ts`.

The answer call uses server-side refusal fallback (`fallbacks: "default"`,
beta `server-side-fallback-2026-07-01`): if a safety classifier declines, the
API retries on a fallback model in the same call. Remove it in
`src/lib/pipeline/answer.ts` if you prefer a decline to end the request.

## Data rules (V0)

No accounts, no database, no stored questions, no analytics. The API route
never logs question or answer text and sends `Cache-Control: no-store`. The
question travels from the home page to `/ask` in memory, never in the URL.
Names (after cues), phones, emails, Aadhaar, PAN, passport, voter ID, UPI IDs
and long account numbers are removed before any model call. A first-visit
acknowledgement (the pattern Indian law-firm sites use under BCI rules) is
remembered in localStorage only. Drafts of `/privacy` (DPDP Act),
`/disclaimer` and `/terms` need a lawyer's review.

## Not in V0

Lawyer directory, referrals, ratings, prices, payments, fine-tuning, accounts,
knowledge graph, scraping. `/find-an-advocate` is a static placeholder.
