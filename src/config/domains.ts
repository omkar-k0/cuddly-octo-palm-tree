/**
 * The domain taxonomy. This is the one place to change practice areas.
 *
 * - id:        stable key used by the classifier, sources/<id>/ and prompts/domains/<id>.md
 * - status:    "live" when sources/<id>/ holds documents you have checked;
 *              "sources-pending" shows a label on the card and answers will
 *              mostly come back "unverifiable" until sources are added
 * - keywords:  used by the mock classifier and as hints for the live one
 * - stateSensitive: answers often turn on state law, so we ask for the state
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
      "private company", "director", "shareholder", "shareholders", "llp", "partnership", "partner",
      "board", "incorporation", "startup", "contract", "breach", "vendor", "invoice",
      "insolvency", "ibc", "nclt", "winding", "roc", "mca", "agm", "esop", "founder",
      "cheque", "bounced", "client", "supplier", "penalty", "invoices", "majority",
    ],
    promptFile: "prompts/domains/corporate.md",
    sourcesDir: "sources/corporate",
    stateSensitive: false,
    status: "live",
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
      "bond", "probation", "overtime", "maternity", "competitor", "offer letter",
      "non-compete", "deducted", "f&f", "laid off", "pregnancy", "contract ended",
    ],
    promptFile: "prompts/domains/employment.md",
    sourcesDir: "sources/employment",
    stateSensitive: false,
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
      "registration", "stamp", "sale", "deed", "society", "mutation", "shop", "vacate",
      "locks", "rented",
    ],
    promptFile: "prompts/domains/real-estate.md",
    sourcesDir: "sources/real-estate",
    stateSensitive: true,
    status: "live",
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
      "instagram", "account", "freelance", "registered trademark", "products",
    ],
    promptFile: "prompts/domains/technology-ip.md",
    sourcesDir: "sources/technology-ip",
    stateSensitive: false,
    status: "live",
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
