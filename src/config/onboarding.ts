/**
 * Lawyer application configuration, per country.
 *
 * CHECK BEFORE LAUNCH: the Bar Council and Rechtsanwaltskammer lists below,
 * the enrolment number hints and the language lists were compiled from
 * general knowledge, not from the official registers. A person must compare
 * them with the Bar Council of India's list of State Bar Councils and the
 * BRAK's list of Rechtsanwaltskammern (including recent splits, mergers and
 * renamings, and which councils cover which Union Territories) before the
 * form is opened to the public.
 *
 * Germany's practice-area names come in V3; for now both countries use the
 * ids from ./domains.
 */
import type { Country } from "@/lib/accounts/types";
import { domains, type DomainId } from "./domains";
import { states } from "./jurisdictions";

export type { Country };

/** Version of the privacy text applicants consent to. Bump when the section changes. */
export const REVIEWER_PRIVACY_VERSION = "2026-11-17-draft";

export interface BarBody {
  id: string;
  name: string;
}

export interface CountryOnboarding {
  country: Country;
  label: string;
  /** Label for the select that picks the bar body. */
  bodyLabel: string;
  bodies: readonly BarBody[];
  /** India only. Formats vary by council, so this is free text with light validation. */
  enrolmentNumber: null | { label: string; hint: string; placeholder: string };
  /** "year" is stored as 1 January of that year; "date" is a full date. */
  enrolmentDate: { kind: "year" | "date"; label: string; hint: string };
  areas: readonly { id: DomainId; title: string }[];
  jurisdictionLabel: string;
  jurisdictions: readonly string[];
  languages: readonly string[];
  phoneHint: string;
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const bodies = (names: readonly string[]): readonly BarBody[] => names.map((name) => ({ id: slug(name), name }));

const areas = domains.map((d) => ({ id: d.id, title: d.title }));

// ── India ──────────────────────────────────────────────────────────────────

/** State and UT Bar Councils (Advocates Act, 1961, section 3). */
export const stateBarCouncils = bodies([
  "Bar Council of Andhra Pradesh",
  "Bar Council of Assam, Nagaland, Mizoram and Arunachal Pradesh",
  "Bar Council of Bihar",
  "Bar Council of Chhattisgarh",
  "Bar Council of Delhi",
  "Bar Council of Gujarat",
  "Bar Council of Himachal Pradesh",
  "Bar Council of Jammu & Kashmir and Ladakh",
  "Bar Council of Jharkhand",
  "Bar Council of Karnataka",
  "Bar Council of Kerala",
  "Bar Council of Madhya Pradesh",
  "Bar Council of Manipur",
  "Bar Council of Maharashtra and Goa",
  "Bar Council of Meghalaya",
  "Bar Council of Orissa",
  "Bar Council of Punjab and Haryana",
  "Bar Council of Rajasthan",
  "Bar Council of Sikkim",
  "Bar Council of Tamil Nadu and Puducherry",
  "Bar Council of Telangana",
  "Bar Council of Tripura",
  "Bar Council of Uttar Pradesh",
  "Bar Council of Uttarakhand",
  "Bar Council of West Bengal",
]);

const indianLanguages = [
  "English", "Hindi",
  // Eighth Schedule languages other than Hindi
  "Assamese", "Bengali", "Bodo", "Dogri", "Gujarati", "Kannada", "Kashmiri", "Konkani", "Maithili", "Malayalam",
  "Manipuri (Meitei)", "Marathi", "Nepali", "Odia", "Punjabi", "Sanskrit", "Santali", "Sindhi", "Tamil", "Telugu", "Urdu",
] as const;

// ── Germany ────────────────────────────────────────────────────────────────

/** The 27 regional Rechtsanwaltskammern and the Rechtsanwaltskammer beim BGH. */
export const rechtsanwaltskammern = bodies([
  "Rechtsanwaltskammer Bamberg",
  "Rechtsanwaltskammer Berlin",
  "Rechtsanwaltskammer Brandenburg",
  "Rechtsanwaltskammer Braunschweig",
  "Rechtsanwaltskammer Bremen",
  "Rechtsanwaltskammer Celle",
  "Rechtsanwaltskammer Düsseldorf",
  "Rechtsanwaltskammer Frankfurt am Main",
  "Rechtsanwaltskammer Freiburg",
  "Rechtsanwaltskammer Hamburg",
  "Rechtsanwaltskammer Hamm",
  "Rechtsanwaltskammer Karlsruhe",
  "Rechtsanwaltskammer Kassel",
  "Rechtsanwaltskammer Koblenz",
  "Rechtsanwaltskammer Köln",
  "Rechtsanwaltskammer Mecklenburg-Vorpommern",
  "Rechtsanwaltskammer München",
  "Rechtsanwaltskammer Nürnberg",
  "Rechtsanwaltskammer Oldenburg",
  "Rechtsanwaltskammer Saarland",
  "Rechtsanwaltskammer Sachsen",
  "Rechtsanwaltskammer Sachsen-Anhalt",
  "Rechtsanwaltskammer Schleswig-Holstein",
  "Rechtsanwaltskammer Stuttgart",
  "Rechtsanwaltskammer Thüringen",
  "Rechtsanwaltskammer Tübingen",
  "Rechtsanwaltskammer Zweibrücken",
  "Rechtsanwaltskammer beim Bundesgerichtshof",
]);

export const laender = [
  "Baden-Württemberg", "Bayern", "Berlin", "Brandenburg", "Bremen", "Hamburg", "Hessen",
  "Mecklenburg-Vorpommern", "Niedersachsen", "Nordrhein-Westfalen", "Rheinland-Pfalz", "Saarland",
  "Sachsen", "Sachsen-Anhalt", "Schleswig-Holstein", "Thüringen",
] as const;

const germanLanguages = [
  "German", "English", "French", "Spanish", "Italian", "Turkish", "Russian", "Polish", "Arabic",
] as const;

// ── Per-country config ─────────────────────────────────────────────────────

export const onboarding: Record<Country, CountryOnboarding> = {
  IN: {
    country: "IN",
    label: "India",
    bodyLabel: "State Bar Council",
    bodies: stateBarCouncils,
    enrolmentNumber: {
      label: "Enrolment number",
      hint: "As on your enrolment certificate. Formats differ between councils.",
      placeholder: "e.g. D/1234/2015 or MAH/1234/2015",
    },
    enrolmentDate: { kind: "year", label: "Year of enrolment", hint: "The year you were enrolled as an advocate." },
    areas,
    jurisdictionLabel: "States and Union Territories you advise on",
    jurisdictions: states,
    languages: indianLanguages,
    phoneHint: "e.g. +91 98765 43210",
  },
  DE: {
    country: "DE",
    label: "Germany",
    bodyLabel: "Rechtsanwaltskammer (bar association)",
    bodies: rechtsanwaltskammern,
    enrolmentNumber: null,
    enrolmentDate: {
      kind: "date",
      label: "Date of admission (Zulassungsdatum)",
      hint: "The date you were admitted as Rechtsanwalt.",
    },
    areas,
    jurisdictionLabel: "Länder you advise on",
    jurisdictions: laender,
    languages: germanLanguages,
    phoneHint: "e.g. +49 30 1234567",
  },
};

export const countries = Object.keys(onboarding) as Country[];

/** Lightest useful check for an Indian enrolment number: contains a digit, only common separators. */
export const ENROLMENT_NUMBER_PATTERN = /^(?=.*\d)[A-Za-z0-9][A-Za-z0-9 /().\-]{2,39}$/;
