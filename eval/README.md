# Eval

The definition of done for V0. Nothing ships without a live run on the 30
labelled questions, with the table copied into the top-level README.

## 1. The questions

`eval/questions.jsonl` holds 30 labelled questions written by Claude at the
product owner's request (12 Employment, 6 Real Estate, 4 Corporate, 4
Technology & IP, 4 out of scope; including criminal, urgent-deadline,
date-dependent, state-dependent and Hinglish cases). **The labels need
review by a lawyer**: a model wrote both the system and its test, which
inflates scores. Add or change questions in the same format, one JSON object per line. See
`questions.example.jsonl` for the format (those four are examples, not part
of the eval).

| Field | Required | Meaning |
|---|---|---|
| `id` | yes | Unique id, e.g. `q01` |
| `question` | yes | The question as a user would type it. No real personal data. |
| `expected_domain` | yes | `corporate`, `employment`, `real-estate`, `technology-ip` or `out_of_scope` |
| `expected_escalate` | yes | `true` if a careful reviewer would send this person to an advocate |
| `expected_citations` | no | Sources a correct answer should cite: `{"act": "...", "section": "4"}` or `{"case": "..."}`. Empty or missing means "not graded on citations" |
| `note` | no | Free text |

## 2. Run

```bash
npm run eval                          # live if ANTHROPIC_API_KEY is set, else mock
npm run eval -- --mode live           # force live
npm run eval -- --file eval/questions.example.jsonl --mode mock
npm run eval -- --mode live --write-readme   # update the README table
npm run eval -- --mode mock --write-readme --allow-mock   # labelled mock baseline
```

Results go to `eval/results/` (git-ignored): `latest.md` (the table) and
`latest.json` (per-question detail). `--write-readme` refuses mock runs
unless `--allow-mock` is given, and then labels the table as a mock baseline.

## 3. Metrics

- **Routing accuracy**: predicted domain (or out of scope) equals `expected_domain`.
- **Citation presence**: of answers with status `answered`, the share with at
  least one valid citation (the gate should make this 100%); plus, of
  in-scope questions, the share that got a cited answer at all.
- **Expected source retrieved (recall@k)**: of questions with
  `expected_citations`, the share where an expected source was among the
  retrieved passages. Separates retrieval misses from answer misses.
- **Expected-citation hit rate**: of questions with `expected_citations`, the
  share where at least one expected source was cited.
- **Escalation agreement**: `escalate` equals `expected_escalate`.
- **Auto-handled**: answered with citations and not escalated.
- **Accuracy per confidence band**: an item is *correct* when the domain
  matches, the escalate flag matches, and (if expected citations are given)
  at least one is cited. Reported for bands 0–0.4, 0.4–0.6, 0.6–0.8, 0.8–1.0.
  A well-calibrated system is more accurate in higher bands.

Correctness of the explanation text itself is not graded yet. See
QUESTIONS.md #3.
