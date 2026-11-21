# Dem Fragen: roadmap

V0 is live: four Indian areas of law, statutes from India Code, law chosen
by date and place, a lawyer verification dashboard. This file plans what
comes next. Decisions still needed are marked **[decide]** and collected at
the end.

| Version | Theme | Scope |
|---|---|---|
| **V1** | Deeper India, ready for the public | Case law, more states and city rules, dashboard upgrades, insights articles, launch safety |
| V2 | Not yet scoped | Candidates left over: live answers and the real eval (needs the API key), Hindi and regional languages, find an advocate |
| **V3** | Germany, in parallel | The same four areas under German law, same product, separate source library and legal pages |

One rule runs through all of it: **nothing ships as "done" without eval
numbers.** Each V1 milestone adds labelled questions to `eval/` and must hold
or improve the scores in the README.

---

## V1: deeper India, ready for the public

### Milestone 0: foundations (first, about 1 week)

Small changes that make everything after cheaper, including V3.

1. **Country dimension.** Add `country` (`IN` now, `DE` in V3) to sources,
   the domain taxonomy, prompts and legal pages. Today India is implied
   everywhere; making it explicit now means Germany is configuration and
   content later, not a rewrite.
2. **Passages, not whole files.** Judgments and long state Acts are too long
   to send whole. Split documents into paragraph-level passages with stable
   ids (`<source-id>#p12`), so citations can pinpoint "para 12" and the
   answer model gets only what matters. Statute sections stay one passage
   each unless very long.
3. **PDF ingestion.** Many state Acts on India Code exist only as PDFs (for
   example the Karnataka Rent Act). Add a PDF-to-text step to the scraper,
   with a quality check that flags pages that need OCR or a human.
4. **CI on GitHub.** A workflow that runs typecheck, lint, tests and build
   on every pull request. Added 21 Nov 2026 (`.github/workflows/ci.yml`);
   locally all four pass (203 tests, lint 0 errors and 4 warnings).

Done when: existing eval scores unchanged; CI green on a PR.

### Milestone 1: launch safety (item 7, about 1 week)

The site is public. Before telling anyone about it:

1. **Rate limiting** on `/api/answer` and the admin login, per IP, with a
   friendly message. Option A: Upstash Redis from the Vercel Marketplace
   (code-level, precise). Option B: Vercel Firewall rate-limit rules (no
   code, coarser). **[decide]** Either way the privacy notice must mention
   short-lived IP processing.
2. **Cost guard** for the Claude API: a daily spend ceiling and a circuit
   breaker that falls back to "we're busy, try later" instead of a surprise
   bill.
3. **Error monitoring** with no question text in any event: Sentry (free
   tier, needs an account) or Vercel's built-in logs and alerts. **[decide]**
4. **Uptime check** on `/` and `/api/answer` (a scheduled ping with an
   alert).
5. **Security headers**: a Content-Security-Policy and a review of the rest.
6. **Accessibility pass** (keyboard, screen reader, contrast) on the home,
   ask and admin pages.
7. **Legal pages finished**: placeholders filled, then reviewed by an
   advocate. Needs your entity details and Anthropic data terms.
8. **Search indexing**: switch on only once the legal pages are reviewed and
   enough sources are verified. **[decide the threshold]**

Done when: a load test (e.g. 50 concurrent questions) gets rate-limited
cleanly, an injected error reaches monitoring without user text, and the
legal pages carry no placeholders.

### Milestone 2: more states and city rules (item 3, about 2 weeks)

1. **States** (proposal; **[decide]**): Karnataka, Tamil Nadu, Telangana,
   Uttar Pradesh, West Bengal, alongside Maharashtra and Delhi. For each:
   - tenancy and rent control
   - shops and establishments (hours, leave, termination notice for many
     private employees)
   - stamp duty on leases and sale deeds
2. **City and local rules** where they change answers: municipal property
   tax and building rules for the big cities (Mumbai, Delhi, Bengaluru,
   Chennai, Hyderabad, Kolkata, Pune). The system already supports
   `jurisdiction: local`; this adds content.
3. **Ask for the place better**: when the state matters and is missing, the
   answer already says so; add one-tap state chips in the answer itself.
4. **Eval**: +15 state- and city-dependent questions.

Done when: recall@k at least 85% on the new questions; each state has
tenancy and shops-and-establishments coverage.

### Milestone 3: case law (item 2, about 3 weeks)

1. **Sources**
   - Supreme Court judgments from the court's own website (allowed host).
   - High Court judgments from the courts' sites or the eCourts judgment
     portal; check each site's terms first.
   - Indian Kanoon has an API, but it is paid and its terms restrict
     scraping. **[decide whether to pay for it]**
2. **Curated, not bulk.** Start with leading judgments per topic (for
   example: gratuity and continuous service, retrenchment compensation,
   post-employment non-competes, RERA refunds and interest, oppression and
   mismanagement, passing off, intermediary liability). Target 60 to 100
   judgments, each split into paragraphs with headnote, bench, date and
   neutral citation.
3. **How judgments are used**
   - Statutes stay primary.
   - A judgment is cited for how a court read a provision, with the
     paragraph number.
   - Judgments carry their own date logic: a ruling on a repealed Act is
     flagged when the event falls under the new law.
4. **Good law check**: a judgment can be overruled. Each one needs a
   lawyer's "still good law" verification and a review date.
5. **Eval**: +15 questions where a judgment is the expected citation.

Done when: the expected judgment is retrieved for at least 80% of the new
questions, and every cited judgment shows court, date and paragraph.

### Milestone 4: dashboard upgrades (item 5, about 2 weeks)

1. **Lawyers correct text in the dashboard.**
   - A lawyer proposes a corrected text; it is stored as a revision with a
     diff.
   - A second lawyer approves it.
   - The approved revision is then served instead of the scraped text.
   - Scraped files are never overwritten silently.
2. **Two-person sign-off** for "Verified": the second approver must be a
   different lawyer. Configurable per area. **[decide: required for all
   areas, or optional]**
3. **Accounts managed in the dashboard**, not environment variables: an
   owner role invites lawyers by email, deactivates them, resets passwords.
   Needs an email provider for invites (e.g. Resend). **[decide]**
4. **Audit export**: CSV of every decision, with reviewer, time, text
   fingerprint and note.
5. **Review queue by priority**: sources cited most often in answers first.
   This counts citations per source only, never question text.
6. **Judgment review**: the "good law" check and review dates from
   milestone 3.

Done when: a correction goes from proposal to approval to live answer, with
both lawyers on record.

### Milestone 5: insights articles (item 6, about 2 weeks)

1. **Drafted from verified sources only.** Claude drafts a short explainer
   per common question (for example "Resigned before five years: gratuity
   rules"), citing only verified sources.
2. **Reviewed in the dashboard**: draft → lawyer edits → approve → publish.
   Each article shows its reviewer and last-reviewed date.
3. **Pages**: `/insights` and `/insights/[slug]` with the same citation
   style as answers, and the home-page cards link to real articles.
4. **Kept current**: when a cited source changes or is rejected, the article
   goes back to review automatically.
5. **SEO** when indexing is switched on (milestone 1).

Done when: 8 articles published (two per area), each lawyer-approved, each
citation verified.

### V1 order and size

| Order | Milestone | Size |
|---|---|---|
| 0 | Foundations: country dimension, passages, PDF ingestion, CI | 1 week |
| 1 | Launch safety | 1 week |
| 2 | States and city rules | 2 weeks |
| 3 | Case law | 3 weeks |
| 4 | Dashboard upgrades | 2 weeks |
| 5 | Insights | 2 weeks |

Milestones 2 and 4 can run alongside 3. Lawyer time is the real limit:
verifying a few hundred sources and judgments, and approving articles.

---

## Lawyer onboarding (India and Germany)

Lawyers apply, the team verifies them, and approved lawyers review sources.
The same flow serves India and Germany. Plan: `docs/lawyer-onboarding-step1.md`.

1. **Accounts:** done. Database accounts, sessions, setup links, audit log, `/team`.
2. **Application page and document upload:** framework done. `/lawyers/join`,
   the API and `/team/applications` exist; document upload is still to do.
3. **Team verification dashboard with decisions:** approve or reject applications.
4. **Reviewer agreement acceptance and the scoped lawyer dashboard.**
5. **German version.**
6. **Security pass.**

---

## V3: Germany, in parallel

Same product, same four areas, German law. Built on the V1 country
dimension, so India and Germany share the code and differ in configuration,
sources, prompts and legal pages.

### Areas

| # | India | Germany |
|---|---|---|
| 01 | Corporate | Gesellschaftsrecht (GmbH, AG, partnerships; GmbHG, HGB, AktG) |
| 02 | Employment | Arbeitsrecht (KSchG, BGB §§ 611a–630, ArbZG, BUrlG, MuSchG, AGG, TzBfG) |
| 03 | Real Estate | Mietrecht & Immobilien (BGB §§ 535–580a, WEG, GrEStG) |
| 04 | Technology & IP | IT-Recht & Geistiges Eigentum (UrhG, MarkenG, DSGVO/BDSG, DDG, TDDDG) |

### Sources (to confirm in a spike)

- **Federal statutes:** gesetze-im-internet.de (Federal Ministry of Justice)
  publishes every federal law, reportedly with XML downloads, so ingestion
  could be cleaner than India's.
- **Federal court decisions:** rechtsprechung-im-internet.de (BGH, BAG,
  BVerwG, BFH, BSG, BVerfG).
- **State law (Landesrecht):** 16 state portals of varying quality. This
  matters less than in India for these four areas, because most of German
  tenancy and employment law is federal.
- **Time:** German law also changes on fixed dates. The `effective_from` and
  `effective_until` logic carries over.

### Language

- German and English answers. The classifier detects the language; answers
  come back in the question's language.
- The eval needs German questions written by a German-qualified reviewer.

### Regulatory: needs a German lawyer before launch

1. **Rechtsdienstleistungsgesetz (RDG).** Only authorised persons may give
   legal services in individual cases. General legal information is
   allowed; how far an AI explanation of someone's specific situation can
   go is the key open question. The BGH's Smartlaw decision (2021, on a
   document generator) helps but does not settle it. **This decides the
   German product's wording and limits.**
2. **Impressum** (Digitale-Dienste-Gesetz, § 5): a full legal notice with a
   responsible person and address.
3. **DSGVO/GDPR** in place of the DPDP Act: a privacy notice with a legal
   basis, a data-processing agreement with Anthropic and Vercel, transfers
   outside the EU (EU–US Data Privacy Framework or standard contractual
   clauses), and an EU hosting region.
4. **TDDDG** for anything stored on the device (our disclaimer
   acknowledgement in localStorage likely needs consent wording, or must
   become strictly necessary).
5. **Advertising rules for lawyers (BRAO)**, if a find-an-advocate feature
   comes later.

### Architecture choices for V3

- **One app, two countries**: `/de` paths or a separate domain
  (`demfragen.de`?). **[decide]**
- **EU data residency:** EU-region functions and an EU database, separate
  from India's.
- **Separate verifier pools:** Indian advocates verify Indian sources;
  German Rechtsanwälte verify German ones. Dashboard access is per country.

### V3 milestones (outline)

1. Spike: German sources, XML ingestion, effective dates. Legal opinion on
   the RDG.
2. Arbeitsrecht and Mietrecht first (most consumer demand), then IT/IP,
   then corporate.
3. German legal pages (Impressum, Datenschutzerklärung, Nutzungsbedingungen,
   Hinweis/Disclaimer).
4. German eval set (30 questions), reviewed by a German lawyer.

---

## Decisions needed

| # | Decision | Needed by | Recommendation |
|---|---|---|---|
| 1 | You said V3 for Germany; is V2 the leftovers (live answers, languages, advocates), or did you mean Germany right after V1? | Now | Keep V3; run its spike during V1 |
| 2 | Rate limiting: Upstash Redis or Vercel Firewall | Milestone 1 | Upstash (precise, per route) |
| 3 | Monitoring: Sentry or Vercel's built-in | Milestone 1 | Sentry free tier, events scrubbed |
| 4 | When to allow search indexing | Milestone 1 | After legal review plus 70% of sources verified |
| 5 | Which states first | Milestone 2 | KA, TN, TG, UP, WB |
| 6 | Pay for the Indian Kanoon API, or official court sites only | Milestone 3 | Official sites first |
| 7 | Two-person sign-off everywhere, or optional | Milestone 4 | Required for judgments and corrections; optional for scraped statutes |
| 8 | Email provider for lawyer invites | Milestone 4 | Resend |
| 9 | Germany: `/de` or its own domain; who is the German reviewing lawyer | V3 spike | Own domain, EU region |
| 10 | Anthropic API key (still blocks live answers and the real eval) | Any time | As soon as possible: every V1 eval gate assumes live mode |
