# Open questions

Things I did not guess. Each one has the default I used so the build could
move; change any of them.

## Blocking "done"

1. **The 30 eval questions.** `eval/questions.jsonl` does not exist yet. The
   format is in `eval/README.md` and `eval/questions.example.jsonl`. Can you
   label each with domain, expected escalate, and expected citations (act +
   section, or case)?
2. **API key for live runs.** No `ANTHROPIC_API_KEY` was available in this
   session, so everything here ran in mock mode. The live path type-checks and
   follows the SDK docs, but it has not made a real call yet.
3. **How should "accuracy" be graded?** Default: an item is correct when the
   domain matches, the escalate flag matches, and (if you listed expected
   citations) at least one of them is cited. Do you want a lawyer-graded or
   LLM-judged correctness score on the summary text too?

## Legal content

4. **Labour Codes.** My understanding is that the four Labour Codes (Wages,
   Industrial Relations, Social Security, OSH) were brought into force on
   21 November 2025 and replace the Payment of Gratuity Act 1972, the
   Industrial Disputes Act 1947 and others. The Employment seed documents in
   `sources/employment/` are short paraphrases of older Acts plus the Codes,
   all marked `verified: false`. Please confirm which instruments to cite, and
   replace the seeds with official text (India Code) before any public use.
5. **Who verifies sources?** Each source file has `verified: true|false`; the
   UI shows unverified citations with a "pending verification" label. Who
   flips the flag, and should unverified sources be excluded in production?
6. **State law.** Tenancy, shops and establishments, and stamp duty vary by
   state. Should V0 ask the user's state, or answer central law only and say so?
7. **Judgments.** Do you want case law in V0 sources, or statutes only to
   start? The schema supports both.
8. **Criminal matters.** Default: anything criminal is escalated and still gets
   a short general answer if it falls inside a domain (e.g. workplace
   harassment that is also an offence). Should criminal queries instead get no
   answer at all, only the escalation?

## Product and thresholds

9. **Low-confidence threshold.** Default 0.6, in `src/config/gating.ts`.
10. **"Deadlines under 7 days".** Default: escalate when a deadline is fewer
    than 7 days away (`< 7`). Exactly 7 days does not escalate. Also: an
    unknown or past deadline does not escalate on its own. OK?
11. **No citation → answer text.** Default: status `unverifiable`, the summary
    says so plainly, no steps are given except "speak to an advocate", and
    confidence is capped at 0.3 (which also sets escalate). OK?
12. **Languages.** English only in V0? Hindi and regional languages change
    the classifier, the PII scrubber and the eval.
13. **Abuse and cost limits.** No accounts means anyone can call the API.
    Default: input capped at 2,000 characters, no rate limit. Do you want
    Vercel's firewall rate limiting, or a per-IP limit in middleware (that
    means processing IPs, which the privacy notice must then mention)?
14. **Insights cards.** The home page has four insights cards with original
    short titles, marked "Coming soon". Who writes the articles?

## Privacy (DPDP)

15. **Name redaction is heuristic.** Phones, emails, Aadhaar, PAN, passport,
    voter ID, UPI and bank-account-like numbers are caught by pattern. Names
    are caught only after cues ("my name is", "Mr", "Smt", "Shri" …). A bare
    name ("Ramesh didn't pay me") will get through. Is that acceptable for V0,
    or do you want a stricter (and more over-redacting) approach?
16. **Data fiduciary details.** The privacy notice has placeholders for the
    legal entity name, address and grievance officer contact. Please supply.
17. **Anthropic as processor.** The notice says scrubbed text is sent to
    Anthropic for processing and is not stored by us. Please confirm your
    Anthropic data-retention settings (e.g. zero data retention) so the notice
    states it accurately, and whether cross-border transfer needs any extra
    wording.
18. **Lawyer review.** The privacy and disclaimer pages are drafts by an
    engineer, not by an advocate. They need review before launch.

## Design

19. **primesec.ai was not reachable** from this sandbox (proxy blocked it), and
    neither were the other reference sites. The home page follows your written
    notes (split-line serif hero, 01–04 cards, insights, restrained motion).
    Can you share screenshots, or the parts of primesec.ai you want echoed?
20. **Name and brand.** The app is called "Nyaya Notes" as a working title.
    Replace in `src/config/site.ts`.
