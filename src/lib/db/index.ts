/**
 * CONTRACT (step 1): one database entry point for the whole app.
 *
 * - DATABASE_URL set → Postgres (Neon on Vercel).
 * - Not on Vercel and no DATABASE_URL → PGlite (in-process Postgres) persisted
 *   in .data/pglite, for local development.
 * - On Vercel without DATABASE_URL → null (accounts and verifications unavailable).
 *
 * Migrations in ./migrations run once per process on first use.
 */
import { runMigrations } from "./migrations";

/** Run one SQL statement with $1..$n parameters; returns rows. */
export type SqlRunner = (text: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;

/** A connection plus a way to run several statements atomically. */
export interface Driver {
  run: SqlRunner;
  /** Run `fn` inside one transaction; statements in `fn` must use the runner it is given. */
  transaction<T>(fn: (run: SqlRunner) => Promise<T>): Promise<T>;
}

/** Wrap a plain runner (one connection, e.g. PGlite in tests): transactions via BEGIN/COMMIT. */
export function driverFromRunner(run: SqlRunner): Driver {
  let queue: Promise<unknown> = Promise.resolve();
  return {
    run,
    transaction(fn) {
      const next = queue.then(async () => {
        await run("BEGIN");
        try {
          const out = await fn(run);
          await run("COMMIT");
          return out;
        } catch (e) {
          await run("ROLLBACK").catch(() => undefined);
          throw e;
        }
      });
      queue = next.catch(() => undefined);
      return next;
    },
  };
}

async function postgresDriver(url: string): Promise<Driver> {
  const { default: postgres } = await import("postgres");
  const sql = postgres(url, { max: 3, idle_timeout: 20, prepare: false });
  type Unsafe = (text: string, params?: never[]) => Promise<unknown>;
  const wrap =
    (s: { unsafe: Unsafe }): SqlRunner =>
    async (text, params) =>
      (await s.unsafe(text, (params ?? []) as never[])) as Record<string, unknown>[];
  return {
    run: wrap(sql as unknown as { unsafe: Unsafe }),
    async transaction(fn) {
      return (await sql.begin((tx) => fn(wrap(tx as unknown as { unsafe: Unsafe })))) as never;
    },
  };
}

async function pgliteDriver(): Promise<Driver> {
  const path = await import("node:path");
  const fs = await import("node:fs/promises");
  const dir = path.join(process.cwd(), ".data", "pglite");
  await fs.mkdir(dir, { recursive: true });
  // Dynamic import, and listed in serverExternalPackages: never bundled, never loaded on Vercel.
  const { PGlite } = await import("@electric-sql/pglite");
  const db = await PGlite.create(dir);
  type Q = { query: (t: string, p?: unknown[]) => Promise<{ rows: unknown[] }> };
  const wrap =
    (q: Q): SqlRunner =>
    async (text, params) =>
      (await q.query(text, params)).rows as Record<string, unknown>[];
  return {
    run: wrap(db),
    transaction: (fn) => db.transaction((tx) => fn(wrap(tx))),
  };
}

// The local PGlite instance must survive dev-server module reloads: two
// instances on one data directory would corrupt it.
const g = globalThis as { __demFragenDb?: Promise<Driver | null> };
let testDriver: Driver | null = null;
let testReady: Promise<Driver> | undefined;

async function open(): Promise<Driver | null> {
  const url = process.env.DATABASE_URL;
  const driver = url ? await postgresDriver(url) : !process.env.VERCEL ? await pgliteDriver() : null;
  if (driver) await runMigrations(driver);
  return driver;
}

/** The migrated database, or null when none is configured. Throws if it cannot be reached. */
export async function getDriver(): Promise<Driver | null> {
  if (testDriver) {
    const d = testDriver;
    testReady ??= runMigrations(d).then(() => d);
    const p = testReady;
    p.catch(() => {
      if (testReady === p) testReady = undefined;
    });
    return p;
  }
  if (!g.__demFragenDb) {
    const p = open();
    g.__demFragenDb = p;
    // Retry on the next call if the database was unreachable.
    p.catch(() => {
      if (g.__demFragenDb === p) g.__demFragenDb = undefined;
    });
  }
  return g.__demFragenDb;
}

export async function getDb(): Promise<SqlRunner | null> {
  return (await getDriver())?.run ?? null;
}

/** Run `fn` in one transaction. Throws if no database is configured. */
export async function withTransaction<T>(fn: (run: SqlRunner) => Promise<T>): Promise<T> {
  const d = await getDriver();
  if (!d) throw new Error("No database is configured.");
  return d.transaction(fn);
}

/** Tests: inject a runner (e.g. in-memory PGlite). Migrations still run on it. Pass null to reset. */
export function setDbForTests(run: SqlRunner | null): void {
  testDriver = run ? driverFromRunner(run) : null;
  testReady = undefined;
}
