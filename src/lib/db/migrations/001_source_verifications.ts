/** The verification log (previously created lazily in src/lib/admin/store.ts). */
export const migration001 = {
  id: "001_source_verifications",
  up: [
    `CREATE TABLE IF NOT EXISTS source_verifications (
  id BIGSERIAL PRIMARY KEY,
  source_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('verified', 'needs_changes', 'rejected')),
  note TEXT NOT NULL DEFAULT '',
  reviewer TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`,
    `CREATE INDEX IF NOT EXISTS source_verifications_source_idx ON source_verifications (source_id, id DESC)`,
    `ALTER TABLE source_verifications ADD COLUMN IF NOT EXISTS reviewer_user_id UUID`,
  ],
};
