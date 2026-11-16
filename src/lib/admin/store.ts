/**
 * Where lawyers' verification decisions are kept: an append-only log, so
 * every decision (who, when, what text they saw) stays on record. The
 * current status of a source is its latest entry.
 *
 * - DATABASE_URL set → Postgres (e.g. Neon from the Vercel Marketplace).
 *   The table is created on first use.
 * - Not on Vercel and no DATABASE_URL → a JSON file in .data/ (local dev).
 * - On Vercel without DATABASE_URL → no store: the dashboard is read-only
 *   and says so; answers fall back to the `verified` flag in source files.
 */
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export const STATUSES = ["verified", "needs_changes", "rejected"] as const;
export type VerificationStatus = (typeof STATUSES)[number];

export interface VerificationEvent {
  id: number;
  source_id: string;
  status: VerificationStatus;
  note: string;
  reviewer: string;
  /** sha256 of the source text the reviewer saw. */
  content_hash: string;
  created_at: string;
}

export type NewVerification = Omit<VerificationEvent, "id" | "created_at">;

export interface VerificationStore {
  kind: "postgres" | "file";
  record(e: NewVerification): Promise<VerificationEvent>;
  /** Latest event per source id. */
  latest(): Promise<Map<string, VerificationEvent>>;
  /** All events for one source, newest first. */
  history(sourceId: string): Promise<VerificationEvent[]>;
}

export function contentHash(text: string): string {
  return crypto.createHash("sha256").update(text.trim()).digest("hex");
}

// ── Postgres ───────────────────────────────────────────────────────────────

/** Minimal query runner so tests can use an in-process Postgres (PGlite). */
export type SqlRunner = (text: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS source_verifications (
  id BIGSERIAL PRIMARY KEY,
  source_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('verified', 'needs_changes', 'rejected')),
  note TEXT NOT NULL DEFAULT '',
  reviewer TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS source_verifications_source_idx ON source_verifications (source_id, id DESC);
`;

function rowToEvent(r: Record<string, unknown>): VerificationEvent {
  return {
    id: Number(r.id),
    source_id: String(r.source_id),
    status: r.status as VerificationStatus,
    note: String(r.note ?? ""),
    reviewer: String(r.reviewer),
    content_hash: String(r.content_hash),
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  };
}

export function postgresStore(run: SqlRunner): VerificationStore {
  let ready: Promise<void> | undefined;
  const init = () => {
    ready ??= (async () => {
      for (const stmt of SCHEMA.split(";").map((s) => s.trim()).filter(Boolean)) await run(stmt);
    })();
    return ready;
  };
  return {
    kind: "postgres",
    async record(e) {
      await init();
      const rows = await run(
        "INSERT INTO source_verifications (source_id, status, note, reviewer, content_hash) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [e.source_id, e.status, e.note, e.reviewer, e.content_hash],
      );
      return rowToEvent(rows[0]);
    },
    async latest() {
      await init();
      const rows = await run("SELECT DISTINCT ON (source_id) * FROM source_verifications ORDER BY source_id, id DESC");
      return new Map(rows.map((r) => [String(r.source_id), rowToEvent(r)]));
    },
    async history(sourceId) {
      await init();
      const rows = await run("SELECT * FROM source_verifications WHERE source_id = $1 ORDER BY id DESC", [sourceId]);
      return rows.map(rowToEvent);
    },
  };
}

// ── File (local development) ───────────────────────────────────────────────

export function fileStore(file: string): VerificationStore {
  const read = async (): Promise<VerificationEvent[]> => {
    try {
      return JSON.parse(await fs.readFile(file, "utf8"));
    } catch {
      return [];
    }
  };
  let queue = Promise.resolve();
  return {
    kind: "file",
    record(e) {
      const p = queue.then(async () => {
        const all = await read();
        const ev: VerificationEvent = { ...e, id: (all.at(-1)?.id ?? 0) + 1, created_at: new Date().toISOString() };
        all.push(ev);
        await fs.mkdir(path.dirname(file), { recursive: true });
        await fs.writeFile(file, JSON.stringify(all, null, 2));
        return ev;
      });
      queue = p.then(() => undefined, () => undefined);
      return p;
    },
    async latest() {
      const m = new Map<string, VerificationEvent>();
      for (const ev of await read()) m.set(ev.source_id, ev);
      return m;
    },
    async history(sourceId) {
      return (await read()).filter((e) => e.source_id === sourceId).reverse();
    },
  };
}

// ── Selection ──────────────────────────────────────────────────────────────

let store: VerificationStore | null | undefined;

export async function getStore(): Promise<VerificationStore | null> {
  if (store !== undefined) return store;
  const url = process.env.DATABASE_URL;
  if (url) {
    const { default: postgres } = await import("postgres");
    const sql = postgres(url, { max: 3, idle_timeout: 20, prepare: false });
    store = postgresStore((text, params) => sql.unsafe(text, (params ?? []) as never[]) as unknown as Promise<Record<string, unknown>[]>);
  } else if (!process.env.VERCEL) {
    store = fileStore(path.join(process.cwd(), ".data", "verifications.json"));
  } else {
    store = null;
  }
  return store;
}

/** For tests. */
export function setStore(s: VerificationStore | null | undefined) {
  store = s;
  overlayCache = undefined;
}

// ── Overlay used by retrieval ──────────────────────────────────────────────

export type EffectiveStatus = "verified" | "unverified" | "needs_changes" | "rejected" | "stale";

/**
 * What a lawyer's latest decision means for a source right now.
 * A verification only counts while the text is unchanged since review.
 */
export function effectiveStatus(
  doc: { hash: string; frontMatterVerified: boolean },
  latest: VerificationEvent | undefined,
): EffectiveStatus {
  if (!latest) return doc.frontMatterVerified ? "verified" : "unverified";
  if (latest.status === "verified") return latest.content_hash === doc.hash ? "verified" : "stale";
  return latest.status;
}

const OVERLAY_TTL_MS = 60_000;
let overlayCache: { at: number; map: Map<string, VerificationEvent> } | undefined;

/** Latest decisions, cached briefly. Never throws: on error, answers fall back to file flags. */
export async function verificationOverlay(): Promise<Map<string, VerificationEvent>> {
  if (overlayCache && Date.now() - overlayCache.at < OVERLAY_TTL_MS) return overlayCache.map;
  try {
    const s = await getStore();
    const map = s ? await s.latest() : new Map<string, VerificationEvent>();
    overlayCache = { at: Date.now(), map };
    return map;
  } catch (e) {
    console.error(`[verifications] overlay unavailable: ${(e as Error).name}`);
    return overlayCache?.map ?? new Map();
  }
}

export function invalidateOverlay() {
  overlayCache = undefined;
}
