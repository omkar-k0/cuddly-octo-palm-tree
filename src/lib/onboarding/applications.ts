/**
 * Lawyer applications: the repository. Every function takes an optional
 * `run` (a SqlRunner) so tests can inject an in-memory database; by default
 * it uses the app's database and throws OnboardingUnavailable when there is none.
 *
 * Never log application contents (names, emails, phone numbers).
 */
import { REVIEWER_PRIVACY_VERSION, type Country } from "@/config/onboarding";
import { getDb, type SqlRunner } from "@/lib/db";
import { enrolmentDateOf, type ApplicationInput } from "./schema";

export const APPLICATION_STATUSES = ["submitted", "under_review", "approved", "rejected", "withdrawn"] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export interface ApplicationDocument {
  /** Storage reference from DocumentStorage.put. */
  ref: string;
  size: number;
  contentType: string;
  kind?: string;
}

export interface ApplicationNote {
  at: string;
  by: string | null;
  text: string;
}

export interface Application {
  id: string;
  country: Country;
  status: ApplicationStatus;
  full_name: string;
  email: string;
  phone: string;
  bar_body: string;
  enrolment_number: string | null;
  /** YYYY-MM-DD. India: 1 January of the year of enrolment. Germany: admission date. */
  enrolment_date: string;
  areas: string[];
  jurisdictions: string[];
  languages: string[];
  documents: ApplicationDocument[];
  consent_privacy_version: string;
  consented_at: string;
  submitted_at: string;
  decided_at: string | null;
  decided_by: string | null;
  decision_reason: string | null;
  notes: ApplicationNote[];
}

/** There is no database to keep applications in. */
export class OnboardingUnavailable extends Error {
  constructor() {
    super("onboarding: no database available");
    this.name = "OnboardingUnavailable";
  }
}

/** An open (submitted or under review) application already exists for this email and country. */
export class DuplicateApplication extends Error {
  constructor() {
    super("onboarding: duplicate open application");
    this.name = "DuplicateApplication";
  }
}

async function runner(run?: SqlRunner): Promise<SqlRunner> {
  if (run) return run;
  const db = await getDb();
  if (!db) throw new OnboardingUnavailable();
  return db;
}

const COLUMNS = `id, country, status, full_name, email, phone, bar_body, enrolment_number,
  to_char(enrolment_date, 'YYYY-MM-DD') AS enrolment_date,
  areas, jurisdictions, languages, documents, consent_privacy_version, consented_at, submitted_at,
  decided_at, decided_by, decision_reason, notes`;

const iso = (v: unknown): string => (v instanceof Date ? v.toISOString() : String(v));
const isoOrNull = (v: unknown): string | null => (v == null ? null : iso(v));
/** jsonb arrives parsed from most drivers, as text from some. */
const json = <T>(v: unknown, fallback: T): T => {
  if (typeof v === "string") {
    try {
      return JSON.parse(v) as T;
    } catch {
      return fallback;
    }
  }
  return (v ?? fallback) as T;
};

function rowToApplication(r: Record<string, unknown>): Application {
  return {
    id: String(r.id),
    country: r.country as Country,
    status: r.status as ApplicationStatus,
    full_name: String(r.full_name),
    email: String(r.email),
    phone: String(r.phone),
    bar_body: String(r.bar_body),
    enrolment_number: r.enrolment_number == null ? null : String(r.enrolment_number),
    enrolment_date: String(r.enrolment_date),
    areas: json<string[]>(r.areas, []),
    jurisdictions: json<string[]>(r.jurisdictions, []),
    languages: json<string[]>(r.languages, []),
    documents: json<ApplicationDocument[]>(r.documents, []),
    consent_privacy_version: String(r.consent_privacy_version),
    consented_at: iso(r.consented_at),
    submitted_at: iso(r.submitted_at),
    decided_at: isoOrNull(r.decided_at),
    decided_by: r.decided_by == null ? null : String(r.decided_by),
    decision_reason: r.decision_reason == null ? null : String(r.decision_reason),
    notes: json<ApplicationNote[]>(r.notes, []),
  };
}

/** Postgres unique_violation, from node-postgres, postgres.js or PGlite. */
const isUniqueViolation = (e: unknown) => typeof e === "object" && e !== null && (e as { code?: unknown }).code === "23505";

/**
 * Store a validated application (status "submitted", consent recorded now).
 * Throws DuplicateApplication when the same email already has an open
 * application for this country.
 */
export async function createApplication(input: ApplicationInput, run?: SqlRunner): Promise<Application> {
  const sql = await runner(run);
  // jsonb values go in as text and are cast, so every driver stores them as JSON
  // (postgres.js would otherwise encode a string a second time).
  try {
    const rows = await sql(
      `INSERT INTO lawyer_applications
         (country, full_name, email, phone, bar_body, enrolment_number, enrolment_date,
          areas, jurisdictions, languages, consent_privacy_version, consented_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8::text::jsonb, $9::text::jsonb, $10::text::jsonb, $11, now())
       RETURNING ${COLUMNS}`,
      [
        input.country,
        input.full_name,
        input.email,
        input.phone,
        input.bar_body,
        input.country === "IN" ? input.enrolment_number : null,
        enrolmentDateOf(input),
        JSON.stringify(input.areas),
        JSON.stringify(input.jurisdictions),
        JSON.stringify(input.languages),
        REVIEWER_PRIVACY_VERSION,
      ],
    );
    return rowToApplication(rows[0]);
  } catch (e) {
    if (isUniqueViolation(e)) throw new DuplicateApplication();
    throw e;
  }
}

/** Newest first, capped at 500. */
export async function listApplications(
  filter: { country?: Country; status?: ApplicationStatus } = {},
  run?: SqlRunner,
): Promise<Application[]> {
  const sql = await runner(run);
  const where: string[] = [];
  const params: unknown[] = [];
  if (filter.country) {
    params.push(filter.country);
    where.push(`country = $${params.length}`);
  }
  if (filter.status) {
    params.push(filter.status);
    where.push(`status = $${params.length}`);
  }
  const rows = await sql(
    `SELECT ${COLUMNS} FROM lawyer_applications ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY submitted_at DESC, id LIMIT 500`,
    params,
  );
  return rows.map(rowToApplication);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getApplication(id: string, run?: SqlRunner): Promise<Application | null> {
  const sql = await runner(run);
  if (!UUID.test(id)) return null;
  const rows = await sql(`SELECT ${COLUMNS} FROM lawyer_applications WHERE id = $1`, [id]);
  return rows[0] ? rowToApplication(rows[0]) : null;
}
