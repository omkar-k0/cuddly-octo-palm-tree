# Source library

The answer model may only cite what is in here. One folder per domain (the
name must match the domain `id` in `src/config/domains.ts`), one Markdown
file per provision or judgment.

## Where documents come from

- **`ic-*.md`: scraped from India Code** (`indiacode.gov.in`) with
  `npm run scrape`. What to fetch is listed in `scripts/scrape/manifest.ts`.
  The scraper uses the site's public DSpace API, one request per second, and
  caches responses in `.cache/` (git-ignored). Re-running overwrites `ic-*`
  files only.
- **Everything else: written by hand.** Currently the pre-Labour-Code Acts
  (Payment of Gratuity Act, Industrial Disputes Act, Payment of Wages Act,
  Maternity Benefit Act). India Code no longer hosts their text since they
  were repealed, so these are paraphrases until official text is added.

Scraping official sources is allowed. Keep it polite (rate limit, cache) and
prefer official government sites.

## File format

```yaml
---
id: ic-code-social-security-2020-s53   # unique, lowercase, dashes
type: statute                  # statute | rule | judgment | notification
title: "Payment of gratuity"
act: "The Code on Social Security, 2020"   # statutes; judgments use case/court/year/citation
section: "Section 53"
source_url: https://indiacode.gov.in/handle/123456789/539659
verified: false                # a lawyer sets true after checking (admin dashboard later)
last_checked: 2026-11-15
keywords: ["gratuity", "fixed term"]
jurisdiction: central          # central | state | local
# state: "Delhi"               # required for state and local law
# local: "Pune"                # required for local law (city, district, village)
effective_from: 2025-11-21     # law applies to events on or after this date
# effective_until: 2025-11-20  # law applies to events on or before this date
provenance: indiacode          # indiacode | manual
act_id: AC_CEN_6_0_00036_202036_1623221080799
scraped_at: 2026-11-15
enforcement_note: "…"          # India Code's enforcement-date text, for review
note: "…"                      # shown to the model as context
---
Text of the provision.
```

## How the fields are used

- **Jurisdiction:** central law always applies; state law only when the
  user's state matches; local law only when the city also matches. State
  and local law is ranked above general law when it applies.
- **Effective dates:** when we know when the events happened, only law in
  force for that period is retrieved (e.g. Gratuity Act for 2025, Code on
  Social Security for 2026). When we do not, both are retrieved and the
  answer explains both and asks for the date.
- **verified:** unverified sources are shown, labelled "pending
  verification", until a lawyer checks them.
