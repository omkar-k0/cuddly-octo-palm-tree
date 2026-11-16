import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { DomainTabs } from "@/components/domain-tabs";
import { HomeQuery } from "@/components/home-query";
import { HowAccordion } from "@/components/how-accordion";
import { insights } from "@/config/insights";
import { site } from "@/config/site";

const how = [
  {
    title: "Describe it in your own words",
    body: "Write what happened the way you would tell a friend. Names, phone numbers and ID numbers are removed on our server before anything else happens.",
  },
  {
    title: "We find the law that applies to you",
    body: "Your question is routed to one of four areas, then matched to provisions from India Code. When it happened and where decide which law we use: several labour laws changed on 21 November 2025, and tenancy rules differ by state.",
  },
  {
    title: "Every statement is cited",
    body: "Each point in the answer carries a numbered source: the Act and section, or the judgment. If nothing in our library supports an answer, we say “unverifiable” instead of guessing.",
  },
  {
    title: "We tell you when to see an advocate",
    body: "Criminal matters, deadlines less than a week away and anything we are not confident about are flagged clearly, with a route to find help.",
  },
  {
    title: "Nothing is kept",
    body: "No accounts, no saved questions, no analytics on what you write. Close the page and it is gone.",
  },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative -mt-[4.25rem] overflow-hidden pt-[4.25rem]">
        <div aria-hidden className="bg-grid pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-7xl px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:pb-28">
          <p className="rise rise-1 mb-10 font-mono text-[0.75rem] uppercase tracking-[0.16em] text-muted-foreground">
            ( Legal first information · India )
          </p>
          <h1 className="font-serif text-[clamp(3rem,9vw,8.75rem)] font-[330] leading-[0.92] tracking-[-0.03em]">
            <span className="rise rise-1 block">Know where</span>
            <span className="rise rise-2 block pl-[7vw] italic text-accent">you stand,</span>
            <span className="rise rise-3 block">before you see</span>
            <span className="rise rise-3 block pl-[15vw]">an advocate.</span>
          </h1>

          <div className="rise rise-4 mt-14 grid gap-10 lg:mt-20 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
            <div className="space-y-5 lg:pt-3">
              <p className="max-w-md text-lg leading-relaxed text-muted-foreground">
                Tell us the problem in plain words. You get a structured explanation of Indian law with every point
                cited to the statute, and a clear signal when the matter needs an advocate.
              </p>
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">
                Information, not advice ·{" "}
                <Link href="/disclaimer" className="underline underline-offset-4 hover:text-foreground">
                  Disclaimer
                </Link>
              </p>
            </div>
            <HomeQuery />
          </div>
        </div>
      </section>

      {/* Statement */}
      <section className="border-t border-foreground/10">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-24 sm:px-8 lg:grid-cols-[1fr_3fr]">
          <p className="reveal font-mono text-[0.75rem] uppercase tracking-[0.16em] text-accent">Our standard</p>
          <p className="reveal font-serif text-[clamp(1.6rem,3.2vw,2.75rem)] leading-[1.18] tracking-[-0.01em]">
            Most people meet the law at a bad moment, with no one to ask.{" "}
            <span className="text-muted-foreground">
              We answer from the statute book, show you exactly where each point comes from, and say plainly when
              the answer is uncertain or the matter needs an advocate.
            </span>
          </p>
        </div>
      </section>

      {/* Domains 01–04 */}
      <section id="domains" className="scroll-mt-24">
        <div className="mx-auto max-w-7xl px-5 pb-24 sm:px-8">
          <div className="reveal mb-2 flex flex-col justify-between gap-4 pt-6 md:flex-row md:items-end">
            <h2 className="font-serif text-4xl leading-tight tracking-tight sm:text-5xl">Four areas of law.</h2>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              We cover four areas well rather than everything loosely. Questions outside them are told so, not
              guessed at.
            </p>
          </div>
          <DomainTabs />
        </div>
      </section>

      {/* How it works: numbered accordion */}
      <section id="how" className="scroll-mt-24 border-t border-foreground/10 bg-band">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[1fr_1.4fr]">
          <div className="reveal lg:sticky lg:top-28 lg:self-start">
            <p className="mb-6 font-mono text-[0.75rem] uppercase tracking-[0.16em] text-muted-foreground">How it works</p>
            <h2 className="font-serif text-4xl leading-[1.05] tracking-tight sm:text-6xl">
              Built to cite,
              <br />
              check, and
              <br />
              <span className="italic text-accent">escalate.</span>
            </h2>
          </div>
          <HowAccordion items={how} />
        </div>
      </section>

      {/* Insights */}
      <section id="insights" className="scroll-mt-24 border-t border-foreground/10">
        <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
          <div className="reveal mb-10 flex items-end justify-between gap-6">
            <div>
              <p className="mb-4 font-mono text-[0.75rem] uppercase tracking-[0.16em] text-muted-foreground">Insights</p>
              <h2 className="font-serif text-4xl leading-tight tracking-tight sm:text-5xl">Questions we see most.</h2>
            </div>
          </div>
          <div className="grid border-l border-t border-foreground/10 sm:grid-cols-2 lg:grid-cols-4">
            {insights.map((i) => (
              <article key={i.title} className="reveal group flex min-h-72 flex-col border-b border-r border-foreground/10 p-7 transition-colors hover:bg-card">
                <p className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-accent">{i.domain}</p>
                <h3 className="mt-5 flex-1 font-serif text-[1.4rem] leading-snug">{i.title}</h3>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{i.dek}</p>
                <p className="mt-6 inline-flex items-center gap-1 font-mono text-[0.7rem] uppercase tracking-[0.12em] text-muted-foreground">
                  Coming soon <ArrowUpRight className="size-3" aria-hidden />
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA: full-bleed accent panel with wordmark */}
      <section className="overflow-hidden bg-accent text-accent-foreground">
        <div className="mx-auto max-w-7xl px-5 pt-16 sm:px-8">
          <p aria-hidden className="select-none whitespace-nowrap font-serif text-[clamp(4rem,15.5vw,15rem)] font-[350] leading-[0.85] tracking-[-0.045em]">
            {site.name}
          </p>
          <div className="grid gap-8 py-16 md:grid-cols-[1.4fr_1fr] md:items-end">
            <h2 className="font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
              Start with <span className="italic">what happened.</span>
            </h2>
            <div className="space-y-5">
              <p className="text-sm leading-relaxed opacity-80">
                Describe your situation. Get the law that applies, with sources you can check, in about a minute.
              </p>
              <Link
                href="/ask"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-accent-foreground px-6 text-sm font-medium text-accent transition-opacity hover:opacity-90"
              >
                Ask a question <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
