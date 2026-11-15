# Nyaya Notes (working title)

Legal first information for India. A person describes a problem in plain
language and gets a structured, cited explanation of where they stand under
Indian law, plus a clear signal when to see an advocate. **Legal
information, not legal advice**, and every answer says so.

V0 status: scaffold, landing page, query flow, and the **Employment** domain
end to end. Not done: see the eval section. Plan in [PLAN.md](PLAN.md), open
questions in [QUESTIONS.md](QUESTIONS.md).

## Eval

<!-- EVAL:START -->
**Not run yet.** Waiting for the 30 labelled questions
(`eval/questions.jsonl`) and an API key for a live run. V0 is not done
until this table holds a live-mode result. See [eval/README.md](eval/README.md).
<!-- EVAL:END -->

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
```

Deploy on Vercel: import the repo, set `ANTHROPIC_API_KEY` (server-side
only), deploy. `next.config.ts` bundles `prompts/` and `sources/` with the
API route.

## How an answer is made

```
question → PII scrub → classifier (claude-haiku-5-5) → retrieve from sources/<domain>/
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
| Source documents (you fill these) | `sources/` — see [sources/README.md](sources/README.md) |
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

Answer JSON: `status, domain, summary, steps, citations[{act, section, case,
…, verified}], confidence, escalate, escalation_reasons, follow_ups,
redactions, disclaimer, mode`. Type in `src/lib/pipeline/types.ts`.

The answer call uses server-side refusal fallback (`fallbacks: "default"`,
beta `server-side-fallback-2026-07-01`): if a safety classifier declines, the
API retries on a fallback model in the same call. Remove it in
`src/lib/pipeline/answer.ts` if you prefer a decline to end the request.

## Data rules (V0)

No accounts, no database, no stored questions, no analytics. The API route
never logs question or answer text and sends `Cache-Control: no-store`. The
question travels from the home page to `/ask` in memory, never in the URL.
Names (after cues), phones, emails, Aadhaar, PAN, passport, voter ID, UPI IDs
and long account numbers are removed before any model call. Draft privacy
notice at `/privacy` and disclaimer at `/disclaimer` (both need lawyer review).

## Not in V0

Lawyer directory, referrals, ratings, prices, payments, fine-tuning, accounts,
knowledge graph, scraping. `/find-an-advocate` is a static placeholder.
