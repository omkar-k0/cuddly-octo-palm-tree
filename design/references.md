# Design references

Patterns to borrow, never assets. We take layout and interaction *ideas* from
these sites. We do not copy their code, text, images, logos, icons or fonts.

| Site | What we take | What we do not take |
|---|---|---|
| https://www.primesec.ai/ | Core reference for the home page: overall pacing, dark/light rhythm, section structure | Copy, branding, illustrations, fonts |
| leome-and-partners.com | Split-line serif hero, numbered 01–04 service cards, insights cards | Copy, photography, logo |
| harvey.ai, legora.com | How legal AI presents trust: sources first, plain statements of limits | Product UI, marketing text |
| perplexity.ai | Answer layout: summary up top, numbered inline source markers, source list, follow-up questions | UI code, iconography |
| doctolib.de | Search → filter → booking flow. **Later only**, if the referral model is cleared | Everything, for now |
| linear.app | Landing page pacing, restrained motion (short fades, small translate, no parallax) | Gradients, code, copy |

## Notes from the first session

- The sandbox could not reach primesec.ai (blocked by the network proxy), so
  the home page follows the written descriptions above, not a live look at the
  site. See QUESTIONS.md.
- Fonts are OFL-licensed and self-hosted from npm (`@fontsource-variable/*`):
  Newsreader (serif, display) and Inter (sans, UI). No font files from any
  reference site.
- Motion: one fade-and-rise on scroll (CSS only), disabled under
  `prefers-reduced-motion`.
