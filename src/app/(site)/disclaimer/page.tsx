import type { Metadata } from "next";
import Link from "next/link";
import { DraftNote, ProsePage } from "@/components/prose-page";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "Disclaimer" };

export default function DisclaimerPage() {
  return (
    <ProsePage eyebrow="Legal" title="Disclaimer" updated="15 November 2026">
      <DraftNote>Draft for review by an advocate before launch.</DraftNote>

      <h2>Not a law firm, no solicitation</h2>
      <p>
        The Bar Council of India does not permit advocates to advertise or solicit work. {site.name} is not a law
        firm, does not practise law, and does not advertise, recommend or refer any advocate. By using this website
        you confirm that you came here of your own accord to find general information, and that no one solicited,
        advertised to or induced you.
      </p>

      <h2>Information, not legal advice</h2>
      <p>
        Everything on this website, including every answer, is general information about Indian law. It is not
        legal advice and is not a substitute for advice from an advocate who knows the facts of your matter.
        Using the service does not create an advocate–client relationship with us or with anyone else, and
        nothing you write to us is privileged.
      </p>

      <h2>How answers are made</h2>
      <ul>
        <li>
          Answers are generated automatically by an AI system, using only the statutes, rules and judgments in our
          source library. Each statement should point to a numbered source so you can check it.
        </li>
        <li>
          Our sources come from official publications such as India Code. Sources marked &ldquo;pending
          verification&rdquo; have not yet been checked against the official text by a lawyer.
        </li>
        <li>
          Which law applies can depend on when things happened and where. We use the date and place you give us,
          or that we can read from your question, and say what we assumed.
        </li>
        <li>
          If our sources do not cover your question, we say &ldquo;unverifiable&rdquo; instead of guessing.
        </li>
        <li>
          The confidence level is our estimate of how well the sources address your question. It is not a
          prediction of what a court or authority will decide.
        </li>
      </ul>

      <h2>Limits you should know</h2>
      <ul>
        <li>The law changes. Our library may not include the latest amendments, rules, notifications or judgments.</li>
        <li>State and local law, your contract and facts we do not know can change the answer.</li>
        <li>AI systems make mistakes, including about which provision applies.</li>
        <li>Many legal steps have time limits. Do not wait on this service if a deadline is close.</li>
      </ul>

      <h2>When to see an advocate</h2>
      <p>
        Speak to an advocate enrolled with a State Bar Council before you act. Always do so if the matter involves
        the police or a criminal case, if a deadline is less than a week away, or if an answer is marked low
        confidence or unverifiable. If you cannot afford an advocate you may be eligible for free legal aid from
        your District Legal Services Authority. See <Link href="/find-an-advocate">Find an advocate</Link>.
      </p>

      <h2>Liability</h2>
      <p>
        To the fullest extent permitted by law, we accept no liability for any loss arising from reliance on
        information on this website. See our <Link href="/terms">terms of use</Link>.
      </p>
    </ProsePage>
  );
}
