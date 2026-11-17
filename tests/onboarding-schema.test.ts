import { describe, expect, it } from "vitest";
import { onboarding } from "@/config/onboarding";
import { enrolmentDateOf, filledTooFast, isPhone, parseApplication } from "@/lib/onboarding/schema";

const NOW = new Date("2026-11-17T12:00:00Z");

const india = (over: Record<string, unknown> = {}) => ({
  country: "IN",
  full_name: "  Asha Rao ",
  email: "  Asha.Rao@Example.IN ",
  phone: "+91 98765 43210",
  bar_body: onboarding.IN.bodies[4].name,
  enrolment_number: "D/1234/2015",
  enrolment_year: 2015,
  areas: ["employment", "corporate", "employment"],
  jurisdictions: ["Delhi"],
  languages: ["English", "Hindi"],
  consent: true,
  company_website: "",
  ...over,
});

const germany = (over: Record<string, unknown> = {}) => ({
  country: "DE",
  full_name: "Jonas Weber",
  email: "jonas@example.de",
  phone: "+49 30 1234567",
  bar_body: "Rechtsanwaltskammer Berlin",
  admission_date: "2016-05-02",
  areas: ["technology-ip"],
  jurisdictions: ["Berlin", "Brandenburg"],
  languages: ["German", "English"],
  consent: true,
  ...over,
});

const fieldsOf = (raw: unknown) => {
  const r = parseApplication(raw, NOW);
  if (r.ok) throw new Error("expected a validation failure");
  return r.fields;
};

describe("application schema: India", () => {
  it("accepts a valid application and normalises it", () => {
    const r = parseApplication(india(), NOW);
    expect(r.ok).toBe(true);
    if (!r.ok || r.data.country !== "IN") throw new Error("unexpected");
    expect(r.data.email).toBe("asha.rao@example.in");
    expect(r.data.full_name).toBe("Asha Rao");
    expect(r.data.areas).toEqual(["employment", "corporate"]);
    expect(enrolmentDateOf(r.data)).toBe("2015-01-01");
  });

  it("rejects bad enrolment years", () => {
    expect(fieldsOf(india({ enrolment_year: 1949 }))).toHaveProperty("enrolment_year");
    expect(fieldsOf(india({ enrolment_year: 2027 }))).toHaveProperty("enrolment_year");
    expect(fieldsOf(india({ enrolment_year: "2015" }))).toHaveProperty("enrolment_year");
    expect(parseApplication(india({ enrolment_year: 2026 }), NOW).ok).toBe(true);
    expect(parseApplication(india({ enrolment_year: 1950 }), NOW).ok).toBe(true);
  });

  it("requires a listed council and a plausible enrolment number", () => {
    expect(fieldsOf(india({ bar_body: "Rechtsanwaltskammer Berlin" }))).toHaveProperty("bar_body");
    expect(fieldsOf(india({ enrolment_number: "" }))).toHaveProperty("enrolment_number");
    expect(fieldsOf(india({ enrolment_number: "ABC" }))).toHaveProperty("enrolment_number");
    expect(fieldsOf(india({ enrolment_number: "<script>1</script>" }))).toHaveProperty("enrolment_number");
    expect(parseApplication(india({ enrolment_number: "MAH/1234/2015" }), NOW).ok).toBe(true);
  });

  it("requires at least one area, at least one language and consent", () => {
    expect(fieldsOf(india({ areas: [] }))).toHaveProperty("areas");
    expect(fieldsOf(india({ areas: ["family-law"] }))).toHaveProperty("areas");
    expect(fieldsOf(india({ languages: [] }))).toHaveProperty("languages");
    expect(fieldsOf(india({ consent: false }))).toHaveProperty("consent");
    expect(fieldsOf(india({ consent: undefined }))).toHaveProperty("consent");
  });

  it("rejects unknown states and foreign phone numbers", () => {
    expect(fieldsOf(india({ jurisdictions: ["Bayern"] }))).toHaveProperty("jurisdictions");
    expect(fieldsOf(india({ phone: "+49 30 1234567" }))).toHaveProperty("phone");
    expect(fieldsOf(india({ phone: "call me" }))).toHaveProperty("phone");
  });

  it("rejects a filled honeypot", () => {
    expect(fieldsOf(india({ company_website: "http://spam.example" }))).toHaveProperty("company_website");
  });

  it("rejects a bad email", () => {
    expect(fieldsOf(india({ email: "not-an-email" }))).toHaveProperty("email");
  });
});

describe("application schema: Germany", () => {
  it("accepts a valid application without an enrolment number", () => {
    const r = parseApplication(germany(), NOW);
    expect(r.ok).toBe(true);
    if (!r.ok || r.data.country !== "DE") throw new Error("unexpected");
    expect(enrolmentDateOf(r.data)).toBe("2016-05-02");
    expect(r.data.company_website).toBe("");
  });

  it("rejects a future, impossible or malformed admission date", () => {
    expect(fieldsOf(germany({ admission_date: "2026-11-18" }))).toHaveProperty("admission_date");
    expect(fieldsOf(germany({ admission_date: "2016-02-30" }))).toHaveProperty("admission_date");
    expect(fieldsOf(germany({ admission_date: "02.05.2016" }))).toHaveProperty("admission_date");
    expect(parseApplication(germany({ admission_date: "2026-11-17" }), NOW).ok).toBe(true);
  });

  it("requires a listed Rechtsanwaltskammer and German-format phone", () => {
    expect(fieldsOf(germany({ bar_body: "Bar Council of Delhi" }))).toHaveProperty("bar_body");
    expect(fieldsOf(germany({ phone: "+91 98765 43210" }))).toHaveProperty("phone");
    expect(parseApplication(germany({ bar_body: "Rechtsanwaltskammer beim Bundesgerichtshof" }), NOW).ok).toBe(true);
  });

  it("rejects a filled honeypot and missing consent", () => {
    expect(fieldsOf(germany({ company_website: "x" }))).toHaveProperty("company_website");
    expect(fieldsOf(germany({ consent: false }))).toHaveProperty("consent");
  });
});

describe("application schema: union", () => {
  it("rejects an unknown or missing country", () => {
    expect(fieldsOf({ ...india(), country: "FR" })).toHaveProperty("country");
    expect(fieldsOf({ ...india(), country: undefined })).toHaveProperty("country");
    expect(parseApplication(null, NOW).ok).toBe(false);
  });

  it("does not echo input in error messages", () => {
    const fields = fieldsOf(india({ full_name: "", email: "secret@leak.example x", phone: "000" }));
    expect(JSON.stringify(fields)).not.toContain("leak.example");
  });
});

describe("phone check", () => {
  it("accepts common Indian formats", () => {
    for (const p of ["+91 98765 43210", "+919876543210", "09876543210", "98765-43210", "0091 98765 43210"]) expect(isPhone("IN", p), p).toBe(true);
  });
  it("accepts common German formats", () => {
    for (const p of ["+49 30 1234567", "+49 170 1234567", "030 1234567", "0049 89 123456"]) expect(isPhone("DE", p), p).toBe(true);
  });
  it("rejects letters, short numbers and wrong countries", () => {
    expect(isPhone("IN", "98765 4321")).toBe(false);
    expect(isPhone("IN", "+44 20 7946 0958")).toBe(false);
    expect(isPhone("IN", "98765 4321a")).toBe(false);
    expect(isPhone("DE", "+49 12")).toBe(false);
  });
});

describe("fill time", () => {
  it("flags forms sent within three seconds", () => {
    expect(filledTooFast({ started_at: 1_000, sent_at: 3_999 })).toBe(true);
    expect(filledTooFast({ started_at: 1_000, sent_at: 4_000 })).toBe(false);
    expect(filledTooFast({ started_at: 5_000, sent_at: 1_000 })).toBe(true);
  });
});
