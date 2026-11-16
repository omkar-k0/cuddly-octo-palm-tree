# Design references

Patterns to borrow, never assets. We take layout and interaction *ideas*.
We do not copy code, text, images, logos, icons or fonts from any site.

| Site | What we take | What we do not take |
|---|---|---|
| primesec.ai (core reference) | See below | Copy, brand, logo, illustrations, fonts (TT Interphases), code, colours as such |
| leome-and-partners.com | Split-line serif hero, numbered 01–04 service cards, insights cards | Copy, photography, logo |
| Indian law firms (Cyril Amarchand Mangaldas, AZB, Khaitan, Trilegal, Shardul Amarchand Mangaldas) | First-visit "I agree" disclaimer (BCI solicitation rules); separate Disclaimer, Privacy, Terms pages; privacy-policy section order | Their text |
| harvey.ai, legora.com | Trust presentation: sources first, plain limits | Product UI, marketing text |
| perplexity.ai | Answer layout: summary, numbered inline sources, source list, follow-ups | UI code, icons |
| doctolib.de | Search → filter → booking. **Later only**, if referrals are cleared | Everything, for now |
| linear.app | Pacing, restrained motion | Gradients, code, copy |

## Patterns taken from the Prime Security page

From the saved page you provided (rendered offline in a sandbox to study
structure; nothing from it is in the repo):

| Pattern on the reference | Our version |
|---|---|
| Near-black base, one bright accent used sparingly | `#111` base, marigold `#f2b53a` accent (warm, Indian; not their lemon yellow), coral for warnings |
| Thin accent announcement bar | "V0 preview" bar, dismissible |
| Floating rounded pill navigation with accent CTA pill | `SiteHeader`, plus a mobile menu |
| Huge left-aligned headline, statement paragraph | Split-line serif hero (from the brief) and an "Our standard" statement with bright/muted contrast |
| Tabbed use-case section with progress underline per tab | `DomainTabs`: 01–04, auto-advance, progress line, pause on hover/focus, keyboard arrows, no auto-advance under reduced motion |
| "( 1 )" numbered accordion with monospace numerals | `HowAccordion` |
| Grid-lined testimonial area | Grid-lined insights cards |
| Full-bleed accent CTA with giant wordmark | Closing panel with our wordmark |
| Monospace for small labels | JetBrains Mono (OFL) |

Not taken: their testimonial carousel and customer logos (we have none),
cookie banner (we set no cookies), the GSAP/Lenis scroll libraries (CSS only).
