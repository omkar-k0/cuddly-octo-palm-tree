/**
 * The domain taxonomy. This is the one place to change practice areas.
 *
 * - id:        stable key used by the classifier, sources/<id>/ and prompts/domains/<id>.md
 * - status:    "live" when sources/<id>/ holds documents you have checked;
 *              "sources-pending" shows a label on the card and answers will
 *              mostly come back "unverifiable" until sources are added
 * - keywords:  used by the mock classifier and as hints for the live one
 */
export const domains = [
  {
    id: "corporate",
    number: "01",
    title: "Corporate",
    blurb:
      "Starting and running a company or LLP, director and shareholder questions, commercial contracts, and insolvency.",
    topics: [
      "Company and LLP formation",
      "Directors' duties and liability",
      "Shareholder and partner disputes",
      "Commercial contracts and breach",
      "Insolvency and recovery (IBC)",
    ],
    keywords: [
      "company", "director", "shareholder", "share", "llp", "partnership", "partner",
      "board", "incorporation", "startup", "contract", "breach", "vendor", "invoice",
      "insolvency", "ibc", "nclt", "winding", "roc", "mca", "agm", "esop", "founder",
    ],
    promptFile: "prompts/domains/corporate.md",
    sourcesDir: "sources/corporate",
    status: "sources-pending",
  },
  {
    id: "employment",
    number: "02",
    title: "Employment",
    blurb:
      "Termination, unpaid salary, gratuity, provident fund, notice periods, and harassment at work.",
    topics: [
      "Termination and retrenchment",
      "Unpaid wages and full-and-final settlement",
      "Gratuity and provident fund",
      "Notice periods and bonds",
      "Sexual harassment at the workplace (POSH)",
    ],
    keywords: [
      "employer", "employee", "job", "salary", "wages", "wage", "fired", "terminated",
      "termination", "dismissed", "resign", "resignation", "notice", "gratuity", "pf",
      "provident", "epf", "bonus", "retrenchment", "layoff", "laid", "hr", "manager",
      "posh", "harassment", "workplace", "appraisal", "relieving", "settlement", "office",
      "company", "bond", "probation", "overtime", "maternity",
    ],
    promptFile: "prompts/domains/employment.md",
    sourcesDir: "sources/employment",
    status: "live",
  },
  {
    id: "real-estate",
    number: "03",
    title: "Real Estate",
    blurb:
      "Renting, buying and building: tenancy, builder delays under RERA, title, registration and housing societies.",
    topics: [
      "Tenancy, rent and security deposits",
      "Builder delays and RERA complaints",
      "Title, sale deeds and registration",
      "Stamp duty",
      "Housing society disputes",
    ],
    keywords: [
      "landlord", "tenant", "rent", "lease", "deposit", "evict", "eviction", "flat",
      "apartment", "builder", "rera", "possession", "property", "plot", "land", "title",
      "registration", "stamp", "sale", "deed", "society", "house", "home", "mutation",
    ],
    promptFile: "prompts/domains/real-estate.md",
    sourcesDir: "sources/real-estate",
    status: "sources-pending",
  },
  {
    id: "technology-ip",
    number: "04",
    title: "Technology & IP",
    blurb:
      "Trademarks, copyright and designs, online platforms under the IT Act, personal data under the DPDP Act, and software deals.",
    topics: [
      "Trademarks and brand names",
      "Copyright and content use",
      "IT Act and intermediary rules",
      "Personal data and the DPDP Act",
      "Software and SaaS contracts",
    ],
    keywords: [
      "trademark", "brand", "logo", "copyright", "patent", "design", "ip", "software",
      "app", "website", "online", "data", "privacy", "dpdp", "it act", "intermediary",
      "content", "infringement", "license", "licence", "saas", "domain", "code", "hacked",
    ],
    promptFile: "prompts/domains/technology-ip.md",
    sourcesDir: "sources/technology-ip",
    status: "sources-pending",
  },
] as const;

export type Domain = (typeof domains)[number];
export type DomainId = Domain["id"];
export const OUT_OF_SCOPE = "out_of_scope" as const;
export type Route = DomainId | typeof OUT_OF_SCOPE;

export const domainIds = domains.map((d) => d.id) as [DomainId, ...DomainId[]];

export function getDomain(id: string): Domain | undefined {
  return domains.find((d) => d.id === id);
}
