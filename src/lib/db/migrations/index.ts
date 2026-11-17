/**
 * Versioned migrations. Each runs once, in order, recorded in
 * schema_migrations. The whole run holds a transaction-scoped advisory lock,
 * so two serverless instances starting together do not race.
 */
import type { Driver } from "../index";
import { migration001 } from "./001_source_verifications";
import { migration002 } from "./002_accounts";
import { migration003 } from "./003_lawyer_applications";

export interface Migration {
  id: string;
  up: string[];
}

export const migrations: Migration[] = [migration001, migration002, migration003];

/** Arbitrary constant key for pg_advisory_xact_lock. */
const LOCK_KEY = 7340211;

const done = new WeakSet<Driver>();

/** Apply pending migrations. Returns the ids applied now. The work happens once per driver. */
export async function runMigrations(driver: Driver, list: Migration[] = migrations): Promise<string[]> {
  if (done.has(driver)) return [];
  const applied = await driver.transaction(async (run) => {
    await run("SELECT pg_advisory_xact_lock($1::bigint)", [LOCK_KEY]);
    await run("CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())");
    const have = new Set((await run("SELECT id FROM schema_migrations")).map((r) => String(r.id)));
    const ran: string[] = [];
    for (const m of list) {
      if (have.has(m.id)) continue;
      for (const stmt of m.up) await run(stmt);
      await run("INSERT INTO schema_migrations (id) VALUES ($1)", [m.id]);
      ran.push(m.id);
    }
    return ran;
  });
  done.add(driver);
  return applied;
}
