# Open questions

## Decided (15–16 Nov 2026)

| # | Question | Decision | Where |
|---|---|---|---|
| 1 | Eval questions | Claude writes them | `eval/questions.jsonl` (30) |
| 2 | API key | Later; code around it | Mock mode until set |
| 4 | Old Acts vs Labour Codes | Both, chosen by when the dispute arose | `effective_from/until` on sources; `src/lib/pipeline/context.ts` |
| 5 | Unverified sources | Shown; a lawyer verifies later from an admin dashboard | `verified` flag, "Pending verification" label |
| 6 | State law | Ask state, and city where local rules apply | "When & where" fields; `jurisdiction/state/local` on sources |
| — | Scraping | Allowed | `npm run scrape` (India Code) |
| 18 | Legal pages | Draft from Indian law-firm patterns; lawyer reviews later | `/disclaimer`, `/privacy`, `/terms`, first-visit gate |
| 19 | Design reference | Saved Prime Security page provided | `design/references.md` |
| 9 | Admin dashboard | Build it | `/admin`, see README |
| — | Going live | User connects the repo to Vercel; site public now | `DEPLOY.md` |

## Still open

### Before "done"

1. **Live eval run.** Needs `ANTHROPIC_API_KEY`. The README shows a mock
   baseline, clearly labelled, until then.
2. **Eval labels need a lawyer's review.** A model wrote both the system and
   its test questions, which flatters the scores. Can the reviewing lawyer
   check `expected_escalate` and `expected_citations`?
3. **Grading.** An item counts as correct when domain, escalation and (if
   given) an expected citation all match. Do you also want the explanation
   text graded (by a lawyer or an LLM judge)?

### Legal content

4. **Official text of the repealed labour Acts.** India Code no longer hosts
   the Payment of Gratuity Act, Industrial Disputes Act, Payment of Wages Act
   or Maternity Benefit Act. Our files for them are paraphrases. Where should
   the official text come from (Legislative Department PDFs, a law reporter)?
5. **Commencement details to confirm.** India Code says the Code on Social
   Security and the Industrial Relations Code came into force on 21 Nov
   2025. For the Code on Wages it records only "phased commencement from
   18 Dec 2020", so I assumed 21 Nov 2025 for sections 17, 18 and 45. For
   the DPDP Act, India Code gives only the assent date; obligations commence
   in phases, so each DPDP source carries a "check commencement" note.
   Please confirm both.
6. **Savings and transition.** For disputes that straddle 21 Nov 2025 (e.g.
   service that began before and ended after), the repeal-and-savings
   provisions decide which law applies. V0 shows both regimes when the date
   falls in November 2025 or is unknown. Is that the right behaviour?
7. **State coverage.** State tenancy law is in for Maharashtra and Delhi.
   Karnataka's Rent Act is on India Code only as a PDF. Which states next?
   No city or village-level instruments are in the library yet, although the
   system supports them.
8. **Case law.** Still statutes only. Which judgments should go in first?
   (Indian Kanoon's terms restrict scraping; Supreme Court and High Court
   sites are options.)
9. **Dashboard follow-ups.** Do you want lawyers to edit source text in the
   dashboard (today they flag "needs changes" and a developer edits the file),
   per-lawyer audit export, or two-person sign-off before "Verified"?

### Product and thresholds

10. **Thresholds** (unchanged): escalate below 0.6 confidence; escalate when a
    deadline is fewer than 7 days away (exactly 7 does not escalate).
11. **Languages.** One eval question is in Hinglish. Full Hindi support needs
    a decision.
12. **Rate limiting.** Still none. Vercel firewall rules, or per-IP limits
    (which the privacy notice would then need to mention)?
13. **Insights articles.** Cards are still "Coming soon". Who writes them?

### Privacy (DPDP)

14. **Placeholders.** Legal entity, address, Grievance Officer, hosting
    provider, log retention period and governing-law city are bracketed in
    `/privacy` and `/terms`.
15. **Anthropic data terms.** The privacy notice needs your account's
    retention and training terms (for example zero data retention) and
    processing locations.
16. **Name redaction is heuristic.** Bare names without a cue still get
    through. Acceptable for V0?
17. **City field.** Users may now enter a city or village. That is low-risk
    but is personal data in combination with a question; the notice covers
    it. OK?

### Brand

18. **Name.** "Nyaya Notes" is still a working title (`src/config/site.ts`).
