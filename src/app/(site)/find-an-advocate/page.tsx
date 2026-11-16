import type { Metadata } from "next";
import { ProsePage } from "@/components/prose-page";

export const metadata: Metadata = { title: "Find an advocate" };

/** Static placeholder. No directory, referrals, ratings or prices in V0. */
export default function FindAnAdvocatePage() {
  return (
    <ProsePage eyebrow="Coming later" title="Find an advocate">
      <p className="text-lg text-muted-foreground">
        We do not list, rate or refer advocates yet. Until we do, here are general routes anyone can use.
      </p>
      <h2>General routes</h2>
      <ul>
        <li>
          <strong>Free legal aid.</strong> Your District Legal Services Authority (DLSA) or State Legal Services
          Authority provides free legal services to eligible people, including women, children, workers and people
          below an income limit.
        </li>
        <li>
          <strong>Bar associations.</strong> The bar association at your local district court can usually point you
          to advocates who practise in the area of law you need.
        </li>
        <li>
          <strong>Check enrolment.</strong> An advocate must be enrolled with a State Bar Council. You can ask for
          their enrolment number.
        </li>
      </ul>
      <h2>What to bring</h2>
      <ul>
        <li>A short written timeline of what happened, with dates.</li>
        <li>Every document: contracts, letters, notices, payslips, receipts, emails and messages.</li>
        <li>Any deadline you have been given, written at the top.</li>
      </ul>
    </ProsePage>
  );
}
