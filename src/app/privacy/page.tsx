import type { Metadata } from "next";
import { DraftNote, ProsePage } from "@/components/prose-page";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "Privacy notice" };

/*
 * Written with the Digital Personal Data Protection Act, 2023 in mind.
 * Draft: needs review by an advocate. Placeholders in [brackets]: QUESTIONS.md #16–18.
 */
export default function PrivacyPage() {
  return (
    <ProsePage eyebrow="Privacy" title="Privacy notice" updated="15 November 2026">
      <DraftNote>
        Draft for V0. To be reviewed by an advocate before launch. Text in [square brackets] is a placeholder.
      </DraftNote>

      <p>
        This notice explains what happens to the information you type into {site.name}, in line with the Digital
        Personal Data Protection Act, 2023 (the &ldquo;DPDP Act&rdquo;). The short version: we do not ask who you
        are, we remove personal details we can detect before your question is processed, and we do not keep your
        question or the answer.
      </p>

      <h2>Who is responsible</h2>
      <p>
        The data fiduciary is [legal entity name], [registered address]. You can contact our grievance officer,
        [name or role], at [email address].
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Your question.</strong> The text you type. We do not ask for your name, phone number, email or any
          account. You do not need to give any of these to use the service.
        </li>
        <li>
          <strong>Technical data.</strong> Our hosting provider processes your IP address and basic request data to
          deliver the page and protect the service from abuse. We do not use it to identify you, and we do not
          link it to your question.
        </li>
      </ul>
      <p>We do not use cookies for tracking, and we do not run analytics on what you write.</p>

      <h2>What we do with your question</h2>
      <ul>
        <li>
          Before anything else, we automatically remove details we can recognise: names that follow cues such as
          &ldquo;my name is&rdquo; or &ldquo;Mr&rdquo;/&ldquo;Smt&rdquo;, phone numbers, email addresses, Aadhaar
          numbers, PAN, passport and voter ID numbers, UPI IDs, and long account-like numbers. This detection is
          automatic and not perfect. Please leave out names and other personal details where you can.
        </li>
        <li>
          The redacted question is sent to our AI service provider, Anthropic, which processes it to classify the
          question and prepare the answer. [Confirm and describe Anthropic&apos;s data retention terms for this
          account, including any zero-data-retention arrangement, and the country where processing takes place.]
        </li>
        <li>
          The answer is sent back to your browser. We do not write your question or the answer to a database or to
          our logs. Closing or refreshing the page discards it.
        </li>
      </ul>

      <h2>Why, and on what basis</h2>
      <p>
        We process your question only to give you the information you asked for. By submitting a question you
        consent to that processing for that purpose. You can withdraw consent at any time by not submitting, or by
        closing the page; because we keep nothing, there is nothing further for us to delete.
      </p>

      <h2>Your rights</h2>
      <p>
        Under the DPDP Act you have the right to information about processing, to correction and erasure, to
        grievance redressal, and to nominate another person to exercise your rights. Because we do not store your
        question or link it to you, we usually hold no personal data about you to access, correct or erase. You can
        still contact our grievance officer at the address above, and you may complain to the Data Protection Board
        of India.
      </p>

      <h2>Children</h2>
      <p>
        This service is meant for adults. If you are under 18, please ask a parent or guardian to help you, or speak
        to an advocate or a legal services authority.
      </p>

      <h2>Changes</h2>
      <p>We will update this page if our practices change, and change the date at the top.</p>
    </ProsePage>
  );
}
