/** Accounts: users, sessions (hashed tokens), one-time setup links (hashed), audit log. */
export const migration002 = {
  id: "002_accounts",
  up: [
    `CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'lawyer')),
  status TEXT NOT NULL CHECK (status IN ('invited', 'active', 'suspended')),
  country TEXT CHECK (country IN ('IN', 'DE')),
  password_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users (id),
  last_login_at TIMESTAMPTZ
)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (lower(email))`,
    `CREATE INDEX IF NOT EXISTS users_role_status_idx ON users (role, status)`,
    `CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
)`,
    `CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id) WHERE revoked_at IS NULL`,
    `CREATE TABLE IF NOT EXISTS account_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users (id),
  purpose TEXT NOT NULL CHECK (purpose IN ('setup')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ
)`,
    `CREATE INDEX IF NOT EXISTS account_tokens_user_idx ON account_tokens (user_id) WHERE used_at IS NULL`,
    `CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id UUID REFERENCES users (id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`,
    `CREATE INDEX IF NOT EXISTS audit_log_target_idx ON audit_log (target_id, id DESC)`,
    `CREATE INDEX IF NOT EXISTS audit_log_action_target_idx ON audit_log (action, target_id, created_at)`,
  ],
};
