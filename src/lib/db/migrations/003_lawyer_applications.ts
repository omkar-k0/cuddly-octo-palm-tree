/**
 * Lawyer applications (step 2 framework). Worker A's migration runner imports
 * this file and runs it after 001 and 002. Keep the export shape.
 *
 * Notes:
 * - `decided_by` is a plain uuid (no foreign key) so this migration does not
 *   depend on the users table; the decision flow in step 3 sets it.
 * - `enrolment_date` is the year of enrolment as 1 January for India and the
 *   admission date for Germany.
 * - One open application (submitted or under_review) per email and country.
 */
export const migration003 = {
  id: "003_lawyer_applications",
  up: [
    `CREATE TABLE IF NOT EXISTS lawyer_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country text NOT NULL CHECK (country IN ('IN', 'DE')),
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'under_review', 'approved', 'rejected', 'withdrawn')),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  bar_body text NOT NULL,
  enrolment_number text,
  enrolment_date date NOT NULL,
  areas jsonb NOT NULL,
  jurisdictions jsonb NOT NULL DEFAULT '[]'::jsonb,
  languages jsonb NOT NULL DEFAULT '[]'::jsonb,
  documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  consent_privacy_version text NOT NULL,
  consented_at timestamptz NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decided_by uuid,
  decision_reason text,
  notes jsonb NOT NULL DEFAULT '[]'::jsonb,
  CONSTRAINT lawyer_applications_in_needs_number CHECK (country <> 'IN' OR enrolment_number IS NOT NULL)
)`,
    `CREATE INDEX IF NOT EXISTS lawyer_applications_status_idx ON lawyer_applications (status, submitted_at)`,
    `CREATE INDEX IF NOT EXISTS lawyer_applications_email_idx ON lawyer_applications (lower(email))`,
    `CREATE UNIQUE INDEX IF NOT EXISTS lawyer_applications_one_open_idx
  ON lawyer_applications (lower(email), country)
  WHERE status IN ('submitted', 'under_review')`,
  ] as string[], // SQL statements, run in order
};
