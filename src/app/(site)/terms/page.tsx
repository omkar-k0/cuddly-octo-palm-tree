import type { Metadata } from "next";
import Link from "next/link";
import { DraftNote, ProsePage } from "@/components/prose-page";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "Terms of use" };

export default function TermsPage() {
  return (
    <ProsePage eyebrow="Legal" title="Terms of use" updated="15 November 2026">
      <DraftNote>Draft for review by an advocate before launch. [Brackets] are placeholders.</DraftNote>

      <h2>1. Agreement</h2>
      <p>
        These terms govern your use of {site.name}, operated by [legal entity name]. By using the website you agree
        to them, to the <Link href="/disclaimer">disclaimer</Link> and to the{" "}
        <Link href="/privacy">privacy notice</Link>. If you do not agree, please do not use the website.
      </p>

      <h2>2. What the service is</h2>
      <p>
        A free service that gives general information about Indian law in response to questions, with references
        to the sources it relied on. It is not legal advice and not a law firm. See the disclaimer.
      </p>

      <h2>3. Acceptable use</h2>
      <ul>
        <li>Use the service for lawful purposes and for your own information.</li>
        <li>Do not enter other people&apos;s personal data, confidential information or anything you are not entitled to share.</li>
        <li>Do not try to disrupt, overload, scrape or reverse-engineer the service, or use it to build a competing dataset.</li>
        <li>Do not present an answer as advice from an advocate or from us.</li>
      </ul>

      <h2>4. Content and sources</h2>
      <p>
        Statutory text is taken from official government publications. The design, software and original text of
        this website belong to [legal entity name]. You may share answers for personal, non-commercial purposes
        with a link to this website.
      </p>

      <h2>5. No warranty, limited liability</h2>
      <p>
        The service is provided &ldquo;as is&rdquo;, without any warranty that it is accurate, complete, current or
        available. To the fullest extent permitted by law, [legal entity name] is not liable for any loss or damage
        arising from your use of, or reliance on, the service.
      </p>

      <h2>6. Links</h2>
      <p>We link to official sources for convenience. We are not responsible for the content of other websites.</p>

      <h2>7. Changes</h2>
      <p>We may change the service or these terms at any time. The date at the top shows the latest version.</p>

      <h2>8. Governing law</h2>
      <p>
        These terms are governed by the laws of India. The courts at [city] have exclusive jurisdiction, subject to
        any right you have under consumer protection law to approach another forum.
      </p>

      <h2>9. Contact</h2>
      <p>[Email address] · Grievance Officer: see the <Link href="/privacy">privacy notice</Link>.</p>
    </ProsePage>
  );
}
