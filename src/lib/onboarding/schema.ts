/**
 * Validation for lawyer applications: one object schema per country, joined
 * as a discriminated union on `country`. Used by the form (before sending)
 * and by POST /api/lawyers/apply (the authority).
 *
 * The schema depends on the current date (year of enrolment, admission date),
 * so it is built per call: `applicationSchema(now)`.
 */
import { z } from "zod";
import { domainIds } from "@/config/domains";
import { ENROLMENT_NUMBER_PATTERN, onboarding } from "@/config/onboarding";

export const MIN_YEAR = 1950;
/** Forms submitted faster than this are treated as bots. */
export const MIN_FILL_MS = 3000;

const names = (list: readonly { name: string }[]) => list.map((b) => b.name) as [string, ...string[]];
const oneOf = (list: readonly string[], message: string) => z.enum(list as unknown as [string, ...string[]], { error: message });

/** Loose phone check: digits, spaces and the usual separators, with a +91 / +49 (or national 0) prefix. */
export function isPhone(country: "IN" | "DE", raw: string): boolean {
  if (!/^[+\d\s()\-/.]+$/.test(raw)) return false;
  const code = country === "IN" ? "91" : "49";
  const compact = raw.replace(/[\s()\-/.]/g, "");
  if (compact.includes("+") && !compact.startsWith("+")) return false;
  // International form must carry this country's code; otherwise it is a national number.
  const intl = compact.startsWith("+") ? compact.slice(1) : compact.startsWith("00") ? compact.slice(2) : null;
  let national: string;
  if (intl !== null) {
    if (!intl.startsWith(code)) return false;
    national = intl.slice(code.length);
  } else {
    national = compact.replace(/^0/, "");
  }
  if (!/^\d+$/.test(national)) return false;
  return country === "IN" ? national.length === 10 : national.length >= 6 && national.length <= 13;
}

const phone = (country: "IN" | "DE") =>
  z
    .string({ error: "Enter a phone number." })
    .trim()
    .max(30, "That phone number is too long.")
    .refine((v) => isPhone(country, v), country === "IN" ? "Use a +91 number, for example +91 98765 43210." : "Use a +49 number, for example +49 30 1234567.");

const isoDate = (s: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

const common = (country: "IN" | "DE") => {
  const c = onboarding[country];
  return {
    full_name: z
      .string({ error: "Enter your full name." })
      .trim()
      .min(2, "Enter your full name.")
      .max(120, "That name is too long."),
    email: z
      .string({ error: "Enter your email address." })
      .trim()
      .toLowerCase()
      .pipe(z.email("Enter a valid email address.").max(200, "That email address is too long.")),
    phone: phone(country),
    areas: z
      .array(z.enum(domainIds, { error: "Choose areas from the list." }), { error: "Choose at least one area." })
      .min(1, "Choose at least one area.")
      .max(domainIds.length)
      .transform((a) => [...new Set(a)]),
    jurisdictions: z
      .array(oneOf(c.jurisdictions, `Choose from the list of ${country === "IN" ? "states" : "Länder"}.`))
      .max(c.jurisdictions.length)
      .default([])
      .transform((a) => [...new Set(a)]),
    languages: z
      .array(oneOf(c.languages, "Choose languages from the list."), { error: "Choose at least one language." })
      .min(1, "Choose at least one language.")
      .max(c.languages.length)
      .transform((a) => [...new Set(a)]),
    consent: z.literal(true, { error: "You must agree to the privacy notice to apply." }),
    /** Honeypot: hidden in the form; people leave it empty, bots fill it. */
    company_website: z.string().max(0, "Leave this field empty.").default(""),
  };
};

export function applicationSchema(now: Date = new Date()) {
  const thisYear = now.getUTCFullYear();
  const today = now.toISOString().slice(0, 10);

  const india = z.object({
    country: z.literal("IN"),
    ...common("IN"),
    bar_body: oneOf(names(onboarding.IN.bodies), "Choose your State Bar Council."),
    enrolment_number: z
      .string({ error: "Enter your enrolment number." })
      .trim()
      .regex(ENROLMENT_NUMBER_PATTERN, "Enter your enrolment number as on your certificate (letters, digits, / and -)."),
    enrolment_year: z
      .number({ error: "Enter the year you were enrolled." })
      .int("Enter a four-digit year.")
      .min(MIN_YEAR, `The year must be ${MIN_YEAR} or later.`)
      .max(thisYear, "The year cannot be in the future."),
  });

  const germany = z.object({
    country: z.literal("DE"),
    ...common("DE"),
    bar_body: oneOf(names(onboarding.DE.bodies), "Choose your Rechtsanwaltskammer."),
    admission_date: z
      .string({ error: "Enter your date of admission." })
      .trim()
      .refine(isoDate, "Enter a valid date.")
      .refine((v) => v >= `${MIN_YEAR}-01-01`, `The date must be ${MIN_YEAR} or later.`)
      .refine((v) => v <= today, "The date cannot be in the future."),
  });

  return z.discriminatedUnion("country", [india, germany], { error: "Choose India or Germany." });
}

export type ApplicationInput = z.output<ReturnType<typeof applicationSchema>>;
export type ApplicationFormInput = z.input<ReturnType<typeof applicationSchema>>;

export type ParseResult = { ok: true; data: ApplicationInput } | { ok: false; fields: Record<string, string> };

/** Parse and flatten errors to one message per field (never echoes the input). */
export function parseApplication(raw: unknown, now: Date = new Date()): ParseResult {
  const r = applicationSchema(now).safeParse(raw);
  if (r.success) return { ok: true, data: r.data };
  const fields: Record<string, string> = {};
  for (const issue of r.error.issues) {
    const key = String(issue.path[0] ?? "form");
    fields[key] ??= issue.message;
  }
  return { ok: false, fields };
}

/** Client-side timing fields sent with the form (not stored). Both are client clock, so skew cancels out. */
export const formMetaSchema = z.object({
  started_at: z.number().finite(),
  sent_at: z.number().finite(),
});

export function filledTooFast(meta: { started_at: number; sent_at: number }): boolean {
  return meta.sent_at - meta.started_at < MIN_FILL_MS;
}

/** The stored `enrolment_date` (YYYY-MM-DD): 1 January of the year for India, the admission date for Germany. */
export function enrolmentDateOf(input: ApplicationInput): string {
  return input.country === "IN" ? `${input.enrolment_year}-01-01` : input.admission_date;
}
