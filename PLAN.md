# PLAN — V0, legal first-information for India

A person describes a problem in plain language and gets a structured, cited
explanation of where they stand, plus a clear signal when to see an advocate.
Legal information, not legal advice; every answer says so.

## 1. Stack

| Layer | Choice | Note |
|---|---|---|
| App | Next.js 16 (App Router) + TypeScript | Deploy on Vercel, Node runtime for the API route |
| Styling | Tailwind v4 + shadcn/ui-style components | Components written in-repo (`src/components/ui`) in the shadcn pattern (cva + tailwind-merge); the shadcn registry was unreachable from the sandbox |
| LLM | Anthropic TypeScript SDK, server-side only | Key in `ANTHROPIC_API_KEY`, never sent to the client |
| Models | Classifier `claude-haiku-5-5`, answerer `claude-opus-5-5` | IDs taken from the current Anthropic model table (Nov 2026), not memory. Both set in `src/config/models.ts` |
| Fonts | Newsreader + Inter (OFL), self-hosted via `@fontsource-variable` | No Google Fonts call at runtime |
| Tests | Vitest | PII scrubber, gating, retrieval |

## 2. Domain taxonomy

One file: `src/config/domains.ts`. Each domain has an id, number (01–04),
title, blurb, sub-topics, router keywords, a system-prompt file under
`prompts/domains/`, and a source folder under `sources/`.

| # | Domain | Example sub-topics |
|---|---|---|
| 01 | Corporate | Company formation, directors' duties, shareholder disputes, contracts, insolvency (IBC) |
| 02 | Employment | Termination, unpaid wages, gratuity, PF, notice periods, workplace harassment (POSH) |
| 03 | Real Estate | Tenancy, RERA builder delays, property title, registration, housing society disputes |
| 04 | Technology & IP | Trademarks, copyright, IT Act, data protection (DPDP), software contracts |

## 3. Answer pipeline (confidence gating)

```
query
  → PII scrub (names, phones, Aadhaar, PAN, emails, other IDs)      src/lib/privacy/scrub.ts
  → classifier (Haiku): domain | out_of_scope, criminal?, deadline   src/lib/pipeline/classify.ts
  → retrieval: top-k passages from sources/<domain>/                 src/lib/retrieval/
  → no passages? → "unverifiable", skip the answer model
  → answerer (Opus): JSON only, cites passage ids                    src/lib/pipeline/answer.ts
  → server-side gate                                                 src/lib/pipeline/gate.ts
       • drop citations whose id was not retrieved
       • zero valid citations → status "unverifiable", confidence capped
       • escalate if criminal, deadline < 7 days, or confidence < 0.6
  → JSON response + disclaimer
```

**The model never names the act.** It cites a retrieved `source_id` and a
pinpoint; the server fills `act`, `section` or `case` from the document's
front-matter. That keeps citations tied to real documents.

Response shape (`src/lib/pipeline/types.ts`):

```json
{
  "status": "answered | unverifiable | out_of_scope",
  "domain": "employment",
  "summary": "…",
  "steps": ["…"],
  "citations": [{ "source_id": "…", "act": "…", "section": "…", "case": null, "verified": false }],
  "confidence": 0.72,
  "escalate": true,
  "escalation_reasons": ["deadline_under_7_days"],
  "follow_ups": ["…"],
  "disclaimer": "…",
  "mode": "live | mock"
}
```

**Mock mode.** If `ANTHROPIC_API_KEY` is unset or `LLM_MODE=mock`, a keyword
classifier and a template answerer built from the retrieved passages stand in
for both models. The UI labels these answers "Mock". The gate, retrieval and
PII scrubbing are identical in both modes.

## 4. Retrieval

Interface (`src/lib/retrieval/types.ts`):

```ts
interface Retriever {
  search(q: { text: string; domain: DomainId; k: number }): Promise<Passage[]>;
}
```

V0 implementation: `LocalFileRetriever`, BM25 over Markdown files in
`sources/<domain>/`, each with YAML front-matter (`id`, `type`, `act`,
`section` or `case`/`court`/`year`, `source_url`, `verified`). No scraping, no
embeddings yet. A vector store can replace it behind the same interface later.

## 5. Data rules

- No accounts, no database, no stored queries, no analytics on query text.
- The API route never logs the query or the answer. Responses carry
  `Cache-Control: no-store`.
- The query is never put in a URL: the home-page box hands it to `/ask` via
  in-memory React state, so it never lands in history, server logs or
  referrers. A refresh drops it.
- PII is scrubbed before any model call; the user sees what was redacted.
- `/privacy` and `/disclaimer` written for the DPDP Act 2023 (needs lawyer review).

## 6. Pages

| Route | Content |
|---|---|
| `/` | Split-line serif hero, query box (main CTA), domains 01–04, how it works, insights cards, disclaimer strip |
| `/ask` | Query box + answer: summary, steps, inline citation markers, source list, confidence, escalation panel, follow-ups |
| `/privacy` | Privacy notice (DPDP) |
| `/disclaimer` | Information-not-advice disclaimer |
| `/find-an-advocate` | Static placeholder only |
| `POST /api/answer` | The pipeline |

## 7. Eval (definition of done)

`eval/questions.jsonl`: 30 labelled questions from the product owner.
`npm run eval` reports:

1. Routing accuracy (predicted vs. labelled domain, incl. out of scope)
2. Citation presence (share of answered items with ≥1 valid citation; and
   match against expected citations when labelled)
3. Accuracy per confidence band (0–0.4, 0.4–0.6, 0.6–0.8, 0.8–1.0)
4. Escalation agreement and share auto-handled (not escalated)

`npm run eval -- --write-readme` writes the table into README.md between
markers. **V0 is not done until that table holds a live-mode run on the 30
real questions.**

## 8. First session scope

- [x] PLAN.md, QUESTIONS.md, design/references.md
- [x] Scaffold (Next.js, Tailwind, shadcn-style UI, Vitest)
- [x] Landing page
- [x] Query flow with a mocked answer
- [x] One domain end to end: **Employment** (prompt, seed sources, routing, gating)
- [x] Eval harness and README table placeholder
- [ ] Real eval run: blocked on the 30 questions and an API key

## 9. Not in V0

Lawyer directory, referrals, ratings, prices, payments, fine-tuning, accounts,
knowledge graph, scraping.
