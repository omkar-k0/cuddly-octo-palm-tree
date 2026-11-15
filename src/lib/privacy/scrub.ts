/**
 * Remove personal identifiers before any text leaves our server.
 *
 * Pattern-based. It catches structured identifiers reliably (phones, emails,
 * Aadhaar, PAN, passport, voter ID, UPI IDs, long account-like numbers).
 * Names are caught only after a cue ("my name is", "Mr", "Smt", "Shri",
 * "Regards,"). A bare name with no cue is NOT caught. See QUESTIONS.md #15.
 */

export type RedactionType =
  | "email"
  | "upi"
  | "aadhaar"
  | "pan"
  | "phone"
  | "passport"
  | "voter_id"
  | "id_number"
  | "name";

export interface ScrubResult {
  text: string;
  redactions: { type: RedactionType; count: number }[];
}

const HONORIFICS =
  "(?:Mr|Mrs|Ms|Miss|Mx|Dr|Prof|Shri|Shree|Sri|Smt|Kumari|Km|Sushri|Adv|Advocate|Justice|Sir|Madam)";
// One to three capitalised words, e.g. "Ramesh", "Anita Rao", "K. S. Iyer".
const NAME_WORDS = "(?:[A-Z]\\.?\\s?)*[A-Z][a-z]+(?:\\s+(?:[A-Z]\\.?\\s?)*[A-Z][a-z]+){0,2}";

interface Rule {
  type: RedactionType;
  pattern: RegExp;
  /** Replace the whole match, or only the captured name group. */
  replace: (match: string, ...groups: string[]) => string;
}

const token = (t: RedactionType) => `[${t.toUpperCase()}]`;

const RULES: Rule[] = [
  {
    type: "email",
    pattern: /\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b/g,
    replace: () => token("email"),
  },
  {
    // UPI handles have no dot after the @, e.g. name@okaxis, 98xxxx@ybl
    type: "upi",
    pattern: /\b[\w.-]{2,}@[a-zA-Z]{2,}\b(?!\.)/g,
    replace: () => token("upi"),
  },
  {
    // Aadhaar: 12 digits, first digit 2-9, often grouped 4-4-4
    type: "aadhaar",
    pattern: /\b[2-9]\d{3}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    replace: () => token("aadhaar"),
  },
  {
    type: "pan",
    pattern: /\b[A-Z]{5}\d{4}[A-Z]\b/gi,
    replace: () => token("pan"),
  },
  {
    // Indian mobiles (+91 / 0 / none, then 6-9 and nine digits, with optional
    // spaces or dashes) and landlines with an STD code.
    type: "phone",
    pattern:
      /(?:(?:\+|00)91[\s-]?|\b0|(?<!\d))[6-9]\d{4}[\s-]?\d{5}\b|\b0\d{2,4}[\s-]\d{6,8}\b/g,
    replace: () => token("phone"),
  },
  {
    type: "voter_id",
    pattern: /\b[A-Z]{3}\d{7}\b/g,
    replace: () => token("voter_id"),
  },
  {
    type: "passport",
    pattern: /\b[A-Z][1-9]\d{6}\b/g,
    replace: () => token("passport"),
  },
  {
    // Bank accounts, UAN, policy and other long numbers (9-18 digits).
    // Amounts written with commas (1,50,000) are not matched.
    type: "id_number",
    pattern: /\b\d{9,18}\b/g,
    replace: () => token("id_number"),
  },
  {
    // Honorific + name: "Mr Sharma", "Smt. Anita Rao", "Dr. K. S. Iyer"
    type: "name",
    pattern: new RegExp(`\\b(${HONORIFICS}\\.?)\\s+(${NAME_WORDS})`, "g"),
    replace: (_m, hon: string) => `${hon} ${token("name")}`,
  },
  {
    // "my name is Ramesh Kumar", "I am called Priya", "named Arjun"
    type: "name",
    pattern: new RegExp(
      `\\b((?:[Mm]y name is|[Mm]y name's|[Nn]ame:|I am called|I'm called|[Nn]amed)\\s+)(${NAME_WORDS})`,
      "g",
    ),
    replace: (_m, cue: string) => `${cue}${token("name")}`,
  },
  {
    // Sign-offs: "Regards, Ramesh" / "Thanks,\nAnita"
    type: "name",
    pattern: new RegExp(
      `\\b((?:[Rr]egards|[Tt]hanks|[Tt]hank you|[Ss]incerely|[Yy]ours truly|[Yy]ours faithfully)[,!]?\\s+)(${NAME_WORDS})\\s*$`,
      "g",
    ),
    replace: (_m, cue: string) => `${cue}${token("name")}`,
  },
];

export function scrubPII(input: string): ScrubResult {
  let text = input;
  const counts = new Map<RedactionType, number>();
  for (const rule of RULES) {
    text = text.replace(rule.pattern, (match: string, ...rest: unknown[]) => {
      counts.set(rule.type, (counts.get(rule.type) ?? 0) + 1);
      const groups = rest.filter((g): g is string => typeof g === "string");
      return rule.replace(match, ...groups);
    });
  }
  return {
    text,
    redactions: [...counts.entries()].map(([type, count]) => ({ type, count })),
  };
}

export const redactionLabels: Record<RedactionType, string> = {
  email: "email address",
  upi: "UPI ID",
  aadhaar: "Aadhaar number",
  pan: "PAN",
  phone: "phone number",
  passport: "passport number",
  voter_id: "voter ID",
  id_number: "account or ID number",
  name: "name",
};
