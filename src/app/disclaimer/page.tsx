import type { Metadata } from "next";
import Link from "next/link";
import { DraftNote, ProsePage } from "@/components/prose-page";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "Disclaimer" };

export default function DisclaimerPage() {
  return (
    <ProsePage eyebrow="Legal" title="Information, not advice" updated="15 November 2026">
      <DraftNote>Draft for V0. To be reviewed by an advocate before launch.</DraftNote>

      <p>
        {site.name} gives general legal information about Indian law. It is not legal advice, and it is not a
        substitute for advice from an advocate who knows the facts of your situation.
      </p>

      <h2>No advocate–client relationship</h2>
      <p>
        Using this service does not create an advocate–client relationship with us or with anyone else.
        {" "}{site.name} is not a law firm and does not practise law. Nothing here is a solicitation or an
        advertisement for legal services.
      </p>

      <h2>How answers are made</h2>
      <ul>
        <li>
          Answers are prepared automatically by an AI system, using only the statutes, rules and judgments in our
          source library. Every statement should point to one of those sources so you can check it.
        </li>
        <li>
          If our sources do not cover your question, the answer says &ldquo;unverifiable&rdquo; rather than
          guessing.
        </li>
        <li>
          Sources marked &ldquo;pending verification&rdquo; have not yet been checked against the official text.
        </li>
        <li>
          Each answer carries a confidence level. It is an estimate of how well our sources address your question,
          not a prediction of how a court or authority will decide.
        </li>
      </ul>

      <h2>Limits you should know about</h2>
      <ul>
        <li>The law changes. Our library may not reflect the latest amendments, notifications or judgments.</li>
        <li>Many questions depend on state law, on your contract, or on facts we do not know.</li>
        <li>AI systems make mistakes, including mistakes about which source applies.</li>
        <li>Time limits apply to many legal steps. Do not wait on this service if a deadline is close.</li>
      </ul>

      <h2>When to see an advocate</h2>
      <p>
        Speak to an advocate enrolled with a State Bar Council before you act on anything here, and always if the
        matter involves the police or a criminal case, if you have a deadline within a week, or if an answer is
        marked low confidence or unverifiable. If you cannot afford an advocate, you may be eligible for free legal
        aid through your District Legal Services Authority. See{" "}
        <Link href="/find-an-advocate">Find an advocate</Link>.
      </p>

      <h2>No liability</h2>
      <p>
        To the extent permitted by law, we are not responsible for any loss arising from reliance on information
        provided by this service.
      </p>
    </ProsePage>
  );
}
