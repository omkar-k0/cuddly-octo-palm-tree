/**
 * CONTRACT (step 1): one database entry point for the whole app.
 *
 * - DATABASE_URL set → Postgres (Neon on Vercel).
 * - Not on Vercel and no DATABASE_URL → PGlite (in-process Postgres) persisted
 *   in .data/pglite, for local development.
 * - On Vercel without DATABASE_URL → null (accounts and verifications unavailable).
 *
 * Migrations in ./migrations run once per process on first use.
 *
 * PLACEHOLDER: Worker A replaces this body. Signatures must not change.
 */

/** Run one SQL statement with $1..$n parameters; returns rows. */
export type SqlRunner = (text: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;

export async function getDb(): Promise<SqlRunner | null> {
  return null;
}

/** Tests: inject a runner (e.g. in-memory PGlite). Migrations still run on it. Pass null to reset. */
export function setDbForTests(_run: SqlRunner | null): void {}
