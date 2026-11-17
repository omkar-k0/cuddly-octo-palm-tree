/**
 * Where lawyers' verification decisions are kept: an append-only log, so
 * every decision (who, when, what text they saw) stays on record. The
 * current status of a source is its latest entry.
 *
 * The database comes from @/lib/db (Postgres via DATABASE_URL, PGlite in
 * .data/pglite locally). The table is created by migration 001. On Vercel
 * without DATABASE_URL there is no store: the dashboard is read-only and says
 * so; answers fall back to the `verified` flag in source files.
 */
import crypto from "node:crypto";
import { getDb, type SqlRunner } from "@/lib/db";

export type { SqlRunner };

export const STATUSES = ["verified", "needs_changes", "rejected"] as const;
export type VerificationStatus = (typeof STATUSES)[number];

export interface VerificationEvent {
  id: number;
  source_id: string;
  status: VerificationStatus;
  note: string;
  /** Reviewer's email at the time of the decision. */
  reviewer: string;
  /** Reviewer's account id (null for decisions made before accounts existed). */
  reviewer_user_id: string | null;
  /** sha256 of the source text the reviewer saw. */
  content_hash: string;
  created_at: string;
}

export type NewVerification = Omit<VerificationEvent, "id" | "created_at">;

export interface VerificationStore {
  kind: "postgres";
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

function rowToEvent(r: Record<string, unknown>): VerificationEvent {
  return {
    id: Number(r.id),
    source_id: String(r.source_id),
    status: r.status as VerificationStatus,
    note: String(r.note ?? ""),
    reviewer: String(r.reviewer),
    reviewer_user_id: r.reviewer_user_id == null ? null : String(r.reviewer_user_id),
    content_hash: String(r.content_hash),
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  };
}

/** Store over a migrated database (the table comes from migration 001). */
export function postgresStore(run: SqlRunner): VerificationStore {
  return {
    kind: "postgres",
    async record(e) {
      const rows = await run(
        "INSERT INTO source_verifications (source_id, status, note, reviewer, reviewer_user_id, content_hash) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
        [e.source_id, e.status, e.note, e.reviewer, e.reviewer_user_id, e.content_hash],
      );
      return rowToEvent(rows[0]);
    },
    async latest() {
      const rows = await run("SELECT DISTINCT ON (source_id) * FROM source_verifications ORDER BY source_id, id DESC");
      return new Map(rows.map((r) => [String(r.source_id), rowToEvent(r)]));
    },
    async history(sourceId) {
      const rows = await run("SELECT * FROM source_verifications WHERE source_id = $1 ORDER BY id DESC", [sourceId]);
      return rows.map(rowToEvent);
    },
  };
}

// ── Selection ──────────────────────────────────────────────────────────────

let override: VerificationStore | null | undefined;
let cached: { run: SqlRunner; store: VerificationStore } | undefined;

export async function getStore(): Promise<VerificationStore | null> {
  if (override !== undefined) return override;
  const run = await getDb();
  if (!run) return null;
  if (cached?.run !== run) cached = { run, store: postgresStore(run) };
  return cached.store;
}

/** For tests: force a store (undefined = use the database again). */
export function setStore(s: VerificationStore | null | undefined) {
  override = s;
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
