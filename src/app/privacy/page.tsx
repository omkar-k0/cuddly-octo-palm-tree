import type { Metadata } from "next";
import Link from "next/link";
import { DraftNote, ProsePage } from "@/components/prose-page";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "Privacy notice" };

/*
 * Notice under the Digital Personal Data Protection Act, 2023. Structure
 * follows the notice contents the Act asks for and the layout common to
 * Indian law-firm privacy policies; the text is original.
 * Draft: to be reviewed by an advocate. [Brackets] are placeholders.
 */
export default function PrivacyPage() {
  return (
    <ProsePage eyebrow="Privacy" title="Privacy notice" updated="15 November 2026">
      <DraftNote>
        Draft for review by an advocate before launch. Text in [square brackets] is a placeholder to be completed.
      </DraftNote>

      <p>
        This notice explains what personal data {site.name} processes when you use it, why, and what rights you
        have under the Digital Personal Data Protection Act, 2023 (the <strong>DPDP Act</strong>) and the rules
        made under it. In short: we do not ask who you are, we strip personal details we can detect before your
        question is processed, and we keep neither your question nor the answer.
      </p>

      <h2>1. Who is responsible for your data</h2>
      <p>
        The Data Fiduciary is [legal entity name], [registered office address] (&ldquo;we&rdquo;, &ldquo;us&rdquo;).
        You can reach our Grievance Officer, [name or designation], at [email address] or [postal address].
      </p>

      <h2>2. What this notice covers</h2>
      <p>
        This website and the question-and-answer service on it. It does not cover websites we link to, such as
        government sources of law, which have their own policies.
      </p>

      <h2>3. Personal data we process</h2>
      <ul>
        <li>
          <strong>Your question.</strong> The text you type. It may contain personal data about you or others even
          though we do not ask for it.
        </li>
        <li>
          <strong>Optional details.</strong> The month the events happened, and the state and city they happened
          in, if you choose to enter them. We use these only to pick the law that applies.
        </li>
        <li>
          <strong>Technical data.</strong> Our hosting provider processes your IP address, browser type and the
          time of each request in order to serve the site and protect it from abuse. We do not link this to your
          question.
        </li>
        <li>
          <strong>Your acknowledgement.</strong> When you click &ldquo;I understand&rdquo; on the disclaimer, your
          browser stores that fact locally so you are not asked on every visit. It never leaves your device.
        </li>
      </ul>
      <p>
        We do <strong>not</strong> collect your name, phone number, email address, government ID numbers or an
        account. We do not use advertising or analytics cookies, and we do not run analytics on what you write.
      </p>

      <h2>4. How your question is processed</h2>
      <ul>
        <li>
          <strong>Redaction first.</strong> Before anything else, our server automatically removes details it
          recognises: names that follow cues such as &ldquo;my name is&rdquo; or &ldquo;Mr&rdquo;, phone numbers,
          email addresses, Aadhaar, PAN, passport and voter ID numbers, UPI IDs and long account-like numbers. This
          is automatic and not perfect, so please leave such details out.
        </li>
        <li>
          <strong>AI processing.</strong> The redacted question is sent to our AI service provider, Anthropic, PBC,
          which processes it on our behalf to classify the question and draft the answer. [State the retention and
          training terms that apply to this account, for example zero data retention.]
        </li>
        <li>
          <strong>No storage.</strong> The answer is returned to your browser. We do not write your question or the
          answer to a database or to our logs. Closing or refreshing the page discards it.
        </li>
      </ul>

      <h2>5. Purpose and basis</h2>
      <p>
        We process your question for one purpose: to give you the legal information you asked for. We rely on
        your consent, which you give by submitting the question after seeing this notice. Technical data is
        processed to run and secure the service. We do not use your data for any other purpose, and we do not sell
        it.
      </p>

      <h2>6. Automated processing</h2>
      <p>
        Answers are generated automatically. They are general information and are not a decision about you. No
        one at {site.name} reads your question.
      </p>

      <h2>7. Who else processes your data</h2>
      <ul>
        <li>Anthropic, PBC (AI processing), as our Data Processor.</li>
        <li>[Hosting provider, e.g. Vercel Inc.] (hosting and delivery), as our Data Processor.</li>
      </ul>
      <p>
        These providers may process data outside India. The DPDP Act permits transfers outside India except to
        countries the Central Government restricts by notification; we will not transfer data to such a country.
        [Confirm processing locations.]
      </p>

      <h2>8. How long we keep it</h2>
      <p>
        We do not keep your question or the answer after your browser receives it. Technical request logs held by
        our hosting provider are kept for [period] for security. Our AI provider&apos;s retention is described in
        section 4.
      </p>

      <h2>9. Security</h2>
      <p>
        Data is encrypted in transit. Our API key and systems are kept server-side, and we apply reasonable
        security safeguards as the DPDP Act requires. If a personal data breach occurs, we will notify the Data
        Protection Board of India and affected persons as the law requires.
      </p>

      <h2>10. Your rights</h2>
      <p>Under the DPDP Act you have the right to:</p>
      <ul>
        <li>obtain a summary of the personal data we process about you and how we process it;</li>
        <li>have inaccurate or incomplete data corrected, and data erased when it is no longer needed;</li>
        <li>have your grievances addressed by us;</li>
        <li>nominate another person to exercise these rights if you die or become incapable; and</li>
        <li>withdraw consent at any time, as easily as you gave it.</li>
      </ul>
      <p>
        Because we keep no record of your questions and cannot link them to you, we will usually hold nothing to
        access, correct or erase. You can still write to our Grievance Officer. If you are not satisfied with our
        response, you may complain to the Data Protection Board of India.
      </p>

      <h2>11. Children</h2>
      <p>
        This service is meant for adults. We do not knowingly process the personal data of anyone under 18. If you
        are under 18, please ask a parent or guardian, or contact your District Legal Services Authority.
      </p>

      <h2>12. Language</h2>
      <p>
        This notice is in English. You may ask the Grievance Officer for it in any language listed in the Eighth
        Schedule to the Constitution.
      </p>

      <h2>13. Changes</h2>
      <p>
        We will update this page if our practices change and revise the date at the top. See also our{" "}
        <Link href="/disclaimer">disclaimer</Link> and <Link href="/terms">terms of use</Link>.
      </p>
    </ProsePage>
  );
}
