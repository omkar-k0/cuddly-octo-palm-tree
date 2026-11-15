/**
 * What to fetch from India Code, per domain. Edit freely; re-run
 * `npm run scrape` to regenerate sources/<domain>/ic-*.md.
 *
 * - sections: section numbers as India Code lists them ("25F", "53")
 * - titleMatch: alternatively, pick sections whose heading matches (state Acts)
 * - effective_from / effective_until: when the law applies to an event.
 *   The four Labour Codes came into force on 21 Nov 2025 (S.O. 5319(E) and
 *   companion notifications, per India Code's legislative history). The Acts
 *   they replace apply to events up to 20 Nov 2025.
 */
import type { DomainId } from "../../src/config/domains";

export interface ManifestEntry {
  domain: DomainId;
  act: string;
  /** Where the law applies (jurisdiction). Omit for law that applies across India. */
  state?: string;
  /** India Code state_name to look the Act up under, if different (e.g. Delhi Acts made by Parliament are "CENTRAL"). */
  lookupAs?: string;
  sections?: string[];
  titleMatch?: RegExp;
  effective_from?: string;
  effective_until?: string;
  keywords: string[];
  note?: string;
}

const LABOUR_CODES_FROM = "2025-11-21";
const CODE_NOTE = "In force from 21 Nov 2025. Applies to events on or after that date.";

export const manifest: ManifestEntry[] = [
  // ── 02 Employment: Labour Codes (from 21 Nov 2025) ──────────────────────
  { domain: "employment", act: "The Code on Social Security, 2020", sections: ["53", "54", "56", "57", "59", "60", "64"], effective_from: LABOUR_CODES_FROM, keywords: ["gratuity", "maternity", "social security", "fixed term", "labour code"], note: CODE_NOTE },
  { domain: "employment", act: "The Industrial Relations Code, 2020", sections: ["70", "75", "79", "80", "83"], effective_from: LABOUR_CODES_FROM, keywords: ["retrenchment", "layoff", "termination", "closure", "worker", "labour code"], note: CODE_NOTE },
  { domain: "employment", act: "The Code on Wages, 2019", sections: ["17", "18", "45"], effective_from: LABOUR_CODES_FROM, keywords: ["salary", "wages", "unpaid", "late salary", "deduction", "full and final", "labour code"], note: `${CODE_NOTE} India Code records phased commencement from 18 Dec 2020; confirm the date for these sections.` },
  // ── 02 Employment: Acts replaced by the Codes (until 20 Nov 2025) ──────
  // India Code no longer hosts the text of these repealed central Acts (only
  // a "Rep., Act 36 of 2020" stub), so they are kept as hand-written files in
  // sources/employment/ with effective_until: 2025-11-20. See QUESTIONS.md.
  // ── 02 Employment: unaffected by the Codes ─────────────────────────────
  { domain: "employment", act: "The Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Act, 2013", sections: ["3", "4", "9", "11", "13", "19"], keywords: ["posh", "sexual harassment", "internal committee", "workplace", "complaint"] },
  { domain: "employment", act: "The Indian Contract Act, 1872", sections: ["27"], keywords: ["non-compete", "restraint of trade", "bond", "employment agreement"] },

  // ── 01 Corporate ───────────────────────────────────────────────────────
  { domain: "corporate", act: "The Companies Act, 2013", sections: ["7", "149", "166", "168", "241", "242", "244"], keywords: ["company", "director", "shareholder", "oppression", "mismanagement", "board", "incorporation"] },
  { domain: "corporate", act: "The Insolvency and Bankruptcy Code, 2016", sections: ["4", "7", "8", "9"], keywords: ["insolvency", "ibc", "nclt", "operational creditor", "financial creditor", "default", "demand notice"] },
  { domain: "corporate", act: "The Indian Contract Act, 1872", sections: ["10", "73", "74"], keywords: ["contract", "breach", "damages", "compensation", "penalty", "agreement"] },
  { domain: "corporate", act: "The Limited Liability Partnership Act, 2008", sections: ["26", "27", "28"], keywords: ["llp", "partner", "liability", "limited liability partnership"] },
  { domain: "corporate", act: "The Indian Partnership Act, 1932", sections: ["25", "43", "44"], keywords: ["partnership", "partner", "dissolution", "firm", "liability"] },
  { domain: "corporate", act: "The Negotiable Instruments Act, 1881", sections: ["138", "142"], keywords: ["cheque bounce", "dishonour", "cheque", "section 138"] },

  // ── 03 Real Estate: central ────────────────────────────────────────────
  { domain: "real-estate", act: "The Real Estate (Regulation and Development) Act, 2016", sections: ["3", "13", "18", "19", "31", "71"], keywords: ["rera", "builder", "possession", "delay", "refund", "allottee", "promoter", "flat"] },
  { domain: "real-estate", act: "The Transfer of Property Act, 1882", sections: ["54", "105", "106", "108", "111"], keywords: ["lease", "tenant", "landlord", "notice", "sale", "property"] },
  { domain: "real-estate", act: "The Registration Act, 1908", sections: ["17", "49"], keywords: ["registration", "registered", "lease deed", "sale deed", "rent agreement"] },
  // ── 03 Real Estate: state rent laws ────────────────────────────────────
  { domain: "real-estate", act: "The Maharashtra Rent Control Act, 1999", state: "Maharashtra", titleMatch: /evict|recovery of possession|deposit|premium|essential (supply|service)|agreement/i, keywords: ["tenant", "landlord", "rent", "eviction", "maharashtra", "mumbai", "pune"] },
  { domain: "real-estate", act: "The Delhi Rent Control Act, 1958", state: "Delhi", lookupAs: "CENTRAL", titleMatch: /evict|recovery of possession|deposit|premium|essential supply|cutting off/i, keywords: ["tenant", "landlord", "rent", "eviction", "delhi"] },
  // Karnataka Rent Act, 1999: India Code has the PDF but no section text yet. Add by hand.

  // ── 04 Technology & IP ─────────────────────────────────────────────────
  { domain: "technology-ip", act: "The Trade Marks Act, 1999", sections: ["27", "28", "29", "134", "135"], keywords: ["trademark", "brand", "passing off", "infringement", "logo", "registered"] },
  { domain: "technology-ip", act: "The Copyright Act, 1957", sections: ["13", "14", "17", "51", "52", "55"], keywords: ["copyright", "content", "infringement", "owner", "fair dealing", "work"] },
  { domain: "technology-ip", act: "The Information Technology Act, 2000", sections: ["43", "43A", "66", "66C", "66D", "72A", "79"], keywords: ["it act", "hacking", "data", "intermediary", "platform", "online", "identity theft", "cheating by personation"] },
  { domain: "technology-ip", act: "The Digital Personal Data Protection Act, 2023", sections: ["4", "5", "6", "8", "11", "12", "13", "33"], keywords: ["dpdp", "personal data", "privacy", "consent", "data fiduciary", "data principal", "breach"], note: "Commencement is phased by notification. Check whether this section is in force on the date that matters before relying on it." },
];
