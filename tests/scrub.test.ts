import { describe, expect, it } from "vitest";
import { scrubPII } from "@/lib/privacy/scrub";

const types = (s: string) => scrubPII(s).redactions.map((r) => r.type).sort();

describe("scrubPII", () => {
  it("removes Indian mobile numbers in common formats", () => {
    for (const p of ["9876543210", "+91 98765 43210", "+91-9876543210", "098765-43210"]) {
      const out = scrubPII(`call me on ${p} please`);
      expect(out.text).not.toMatch(/\d{5}/);
      expect(out.text).toContain("[PHONE]");
    }
  });

  it("removes Aadhaar, PAN, email, UPI, passport, voter ID", () => {
    const s = "Aadhaar 2345 6789 0123, PAN ABCDE1234F, mail a.b@example.co.in, upi ravi99@okaxis, passport K1234567, EPIC ABC1234567";
    const out = scrubPII(s);
    expect(out.text).not.toMatch(/2345|ABCDE1234F|example|okaxis|K1234567|ABC1234567/);
    expect(types(s)).toEqual(["aadhaar", "email", "pan", "passport", "upi", "voter_id"]);
  });

  it("removes long account-like numbers but keeps amounts, years and sections", () => {
    const out = scrubPII("My account 001234567890123 was not credited Rs 1,50,000 in 2024 under Section 25F");
    expect(out.text).toContain("[ID_NUMBER]");
    expect(out.text).toContain("1,50,000");
    expect(out.text).toContain("2024");
    expect(out.text).toContain("Section 25F");
  });

  it("removes names after cues and honorifics", () => {
    const out = scrubPII("My name is Ramesh Kumar. My manager Mr. Sharma and Smt. Anita Rao fired me. Regards, Priya");
    expect(out.text).not.toMatch(/Ramesh|Sharma|Anita|Priya/);
    expect(out.text).toContain("Mr. [NAME]");
  });

  it("leaves ordinary text alone", () => {
    const s = "I worked for 6 years and resigned last month. Is gratuity payable?";
    expect(scrubPII(s).text).toBe(s);
    expect(scrubPII(s).redactions).toEqual([]);
  });
});
