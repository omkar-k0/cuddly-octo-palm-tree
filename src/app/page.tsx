import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { DomainAskLink, HomeQuery } from "@/components/home-query";
import { Badge } from "@/components/ui/badge";
import { domains } from "@/config/domains";
import { insights } from "@/config/insights";

const steps = [
  {
    n: "i",
    title: "Describe it plainly",
    body: "Write what happened the way you would tell a friend. We remove names and numbers before anything leaves our server.",
  },
  {
    n: "ii",
    title: "We find the right law",
    body: "Your question is routed to one of four areas, and matched to provisions and judgments in our source library.",
  },
  {
    n: "iii",
    title: "You get a cited explanation",
    body: "Where you stand, what it depends on, and practical next steps, each tied to a source you can check.",
  },
  {
    n: "iv",
    title: "We say when to see an advocate",
    body: "Criminal matters, deadlines under a week, and anything we are not sure about are flagged for an advocate.",
  },
];

const promises = [
  { title: "Every statement is sourced", body: "Each claim points to a numbered act, section or judgment from our library. No source, no claim." },
  { title: "“Unverifiable” is an answer", body: "If our sources do not cover your question, we say so instead of guessing." },
  { title: "Confidence, shown plainly", body: "Each answer carries a confidence level. Low confidence sends you to an advocate." },
  { title: "Nothing is kept", body: "No accounts, no saved questions, no analytics on what you write." },
];

export default function Home() {
  return (
    <>
      {/* Hero: split-line serif headline */}
      <section className="mx-auto max-w-7xl px-5 pb-16 pt-14 sm:px-8 sm:pt-20 lg:pb-24">
        <p className="rise rise-1 mb-8 text-[0.72rem] uppercase tracking-[0.18em] text-muted-foreground">
          Legal first information · India
        </p>
        <h1 className="font-serif text-[clamp(2.9rem,8.6vw,8rem)] font-[360] leading-[0.94] tracking-[-0.025em]">
          <span className="rise rise-1 block">Know where</span>
          <span className="rise rise-2 block pl-[8vw] italic text-accent">you stand,</span>
          <span className="rise rise-3 block">before you see</span>
          <span className="rise rise-3 block pl-[16vw]">an advocate.</span>
        </h1>

        <div className="rise rise-4 mt-12 grid gap-10 lg:mt-16 lg:grid-cols-[1fr_1.55fr] lg:gap-16">
          <div className="space-y-4 lg:pt-2">
            <p className="max-w-md text-lg leading-relaxed text-muted-foreground">
              Tell us the problem in your own words. You get a structured explanation of Indian law with every
              point cited, and a clear signal when the matter needs an advocate.
            </p>
            <p className="max-w-md text-sm text-muted-foreground">
              Legal information, not legal advice.{" "}
              <Link href="/disclaimer" className="underline underline-offset-4 hover:text-foreground">
                Read the disclaimer
              </Link>
              .
            </p>
          </div>
          <HomeQuery />
        </div>
      </section>

      {/* Domains 01–04 */}
      <section id="domains" className="scroll-mt-16 border-t border-foreground/10">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <div className="reveal mb-12 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <h2 className="font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
              Four areas of law,
              <br />
              <span className="italic text-muted-foreground">one standard of care.</span>
            </h2>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              We cover four areas well rather than everything loosely. Questions outside them are told so, not
              guessed at.
            </p>
          </div>
          <ol className="grid border-l border-t border-foreground/10 sm:grid-cols-2 lg:grid-cols-4">
            {domains.map((d) => (
              <li
                key={d.id}
                className="reveal group flex flex-col border-b border-r border-foreground/10 p-7 transition-colors hover:bg-card"
              >
                <div className="mb-10 flex items-start justify-between">
                  <span className="font-serif text-6xl font-[300] leading-none text-muted-foreground/60 transition-colors group-hover:text-accent">
                    {d.number}
                  </span>
                  {d.status === "live" ? (
                    <Badge variant="verified">Live</Badge>
                  ) : (
                    <Badge>Sources pending</Badge>
                  )}
                </div>
                <h3 className="font-serif text-[1.7rem] leading-tight">{d.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{d.blurb}</p>
                <ul className="mt-6 flex-1 divide-y divide-foreground/10 border-y border-foreground/10 text-sm">
                  {d.topics.map((t) => (
                    <li key={t} className="py-2">
                      {t}
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  <DomainAskLink id={d.id} title={d.title} />
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-16 border-t border-foreground/10 bg-card">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <h2 className="reveal mb-12 max-w-2xl font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
            From a plain description to a cited answer.
          </h2>
          <ol className="grid gap-px overflow-hidden rounded-lg border border-foreground/10 bg-foreground/10 md:grid-cols-4">
            {steps.map((s) => (
              <li key={s.n} className="reveal bg-card p-7">
                <span className="font-serif text-lg italic text-accent">{s.n}.</span>
                <h3 className="mt-3 font-serif text-2xl leading-snug">{s.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Trust: dark editorial band */}
      <section className="bg-band text-band-foreground">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[1fr_1.3fr]">
          <div className="reveal">
            <p className="mb-6 text-[0.72rem] uppercase tracking-[0.18em] text-band-muted">What every answer carries</p>
            <h2 className="font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
              Built to be checked,
              <br />
              <span className="italic">not just believed.</span>
            </h2>
          </div>
          <dl className="grid gap-x-10 gap-y-10 sm:grid-cols-2">
            {promises.map((p) => (
              <div key={p.title} className="reveal border-t border-band-border pt-5">
                <dt className="font-serif text-xl">{p.title}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-band-muted">{p.body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Insights */}
      <section id="insights" className="scroll-mt-16">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <div className="reveal mb-10 flex items-end justify-between gap-6">
            <h2 className="font-serif text-4xl leading-tight tracking-tight sm:text-5xl">Insights</h2>
            <p className="max-w-xs text-right text-sm text-muted-foreground">Short explainers on the questions we see most.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {insights.map((i) => (
              <article
                key={i.title}
                className="reveal flex flex-col rounded-lg border border-foreground/10 bg-card p-6 transition-colors hover:border-foreground/30"
              >
                <p className="text-[0.7rem] uppercase tracking-[0.14em] text-accent">{i.domain}</p>
                <h3 className="mt-4 flex-1 font-serif text-xl leading-snug">{i.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{i.dek}</p>
                <p className="mt-6 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  Coming soon <ArrowUpRight className="size-3" aria-hidden />
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="border-t border-foreground/10">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-5 py-20 sm:px-8 md:flex-row md:items-end">
          <h2 className="reveal font-serif text-4xl leading-tight tracking-tight sm:text-6xl">
            Start with
            <br />
            <span className="italic text-accent">what happened.</span>
          </h2>
          <Link
            href="/ask"
            className="reveal inline-flex h-12 items-center gap-2 rounded-md bg-primary px-6 text-primary-foreground transition-opacity hover:opacity-90"
          >
            Ask a question <span aria-hidden>→</span>
          </Link>
        </div>
      </section>
    </>
  );
}
