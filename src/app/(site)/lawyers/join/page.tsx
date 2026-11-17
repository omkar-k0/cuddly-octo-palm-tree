import type { Metadata } from "next";
import { REVIEWER_ATTRIBUTION } from "@/config/reviewers";
import { site } from "@/config/site";
import { JoinForm } from "./join-form";

export const metadata: Metadata = {
  title: "Become a reviewer",
  description: `Lawyers in India and Germany can apply to review the sources ${site.name} uses.`,
};

/** Public application for lawyers who want to review sources. Static shell; the form is a client component. */
export default function JoinPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 pb-24 pt-14 sm:px-8">
      <p className="mb-5 font-mono text-[0.72rem] uppercase tracking-[0.16em] text-accent">( For lawyers )</p>
      <h1 className="font-serif text-5xl leading-[1.02] tracking-tight sm:text-6xl">Become a reviewer</h1>
      <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
        {site.name} explains the law in plain words and cites its sources. Lawyers check those sources, so that people can
        see which of them a professional has verified.
      </p>

      <div className="mt-10 grid gap-8 sm:grid-cols-2">
        <section className="space-y-3">
          <h2 className="font-serif text-2xl">Who can apply</h2>
          <ul className="ml-5 list-disc space-y-2 text-sm leading-relaxed text-foreground/85">
            <li>
              <strong>India:</strong> advocates enrolled with a State Bar Council.
            </li>
            <li>
              <strong>Germany:</strong> Rechtsanwältinnen and Rechtsanwälte admitted and registered with a Rechtsanwaltskammer.
            </li>
            <li>You practise, or have practised, in one or more of the areas of law we cover.</li>
          </ul>
        </section>
        <section className="space-y-3">
          <h2 className="font-serif text-2xl">What happens next</h2>
          <ol className="ml-5 list-decimal space-y-2 text-sm leading-relaxed text-foreground/85">
            <li>You send this form.</li>
            <li>Our team verifies your enrolment.</li>
            <li>Approved reviewers accept a reviewer agreement and then review the sources our answers use.</li>
          </ol>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {REVIEWER_ATTRIBUTION === "anonymous"
              ? "Reviewers are not shown publicly for now. Answers say a source is verified, not who verified it."
              : "Reviewers are shown by name next to the sources they verify. Ask us about this before you apply."}
          </p>
        </section>
      </div>

      <div className="mt-12">
        <JoinForm />
      </div>
    </div>
  );
}
