# Source library

The answer model may only cite what is in here. One folder per domain (the
folder name must match the domain `id` in `src/config/domains.ts`), one
Markdown file per provision or judgment.

**No scraping.** Add documents by hand from official sources (India Code,
the Gazette, court websites). The retriever is `src/lib/retrieval/local.ts`
(BM25 over these files); it can be swapped behind the `Retriever` interface.

## File format

Copy `_template.md`. Files starting with `_` and `README.md` are ignored.

```yaml
---
id: pgact-1972-s4              # unique, lowercase, dashes
type: statute                  # statute | rule | judgment | notification
title: Payment of gratuity     # short heading
act: Payment of Gratuity Act, 1972   # statutes and rules
section: Section 4
# case: X v. Y                 # judgments: case, court, year, citation
# court: Supreme Court of India
# year: 2019
# citation: (2019) 1 SCC 1
source_url: https://www.indiacode.nic.in/
verified: false                # true only after a person checks it against the official text
last_checked: 2026-11-15
keywords: [gratuity, resignation, five years]
note: optional, shown to maintainers only
---
Text of the provision, or a faithful extract. Keep one provision per file so
citations stay precise.
```

## Rules

- `verified: false` documents are still retrieved, but every citation to
  them shows "pending verification" in the UI. Set `verified: true` only
  after checking against the official text.
- Put the provision's own words in the body where you can. Paraphrases must
  say they are paraphrases.
- Note in the body if a provision has been repealed or replaced, and from
  when.
