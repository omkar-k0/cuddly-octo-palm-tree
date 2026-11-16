import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import {
  contentHash,
  effectiveStatus,
  fileStore,
  postgresStore,
  setStore,
  verificationOverlay,
  type VerificationStore,
} from "@/lib/admin/store";
import { LocalFileRetriever } from "@/lib/retrieval/local";

async function exercise(store: VerificationStore) {
  const a = await store.record({ source_id: "s1", status: "needs_changes", note: "typo in (b)", reviewer: "l@x.in", content_hash: "h1" });
  await store.record({ source_id: "s2", status: "rejected", note: "wrong act", reviewer: "l@x.in", content_hash: "h2" });
  const c = await store.record({ source_id: "s1", status: "verified", note: "", reviewer: "m@x.in", content_hash: "h1" });
  expect(c.id).toBeGreaterThan(a.id);

  const latest = await store.latest();
  expect(latest.get("s1")?.status).toBe("verified");
  expect(latest.get("s1")?.reviewer).toBe("m@x.in");
  expect(latest.get("s2")?.status).toBe("rejected");

  const hist = await store.history("s1");
  expect(hist.map((h) => h.status)).toEqual(["verified", "needs_changes"]);
  expect(hist[1].note).toBe("typo in (b)");
}

describe("verification stores", () => {
  it("postgres store (PGlite) keeps an append-only log", async () => {
    const db = new PGlite();
    const store = postgresStore(async (text, params) => (await db.query<Record<string, unknown>>(text, params)).rows);
    await exercise(store);
    await expect(
      store.record({ source_id: "s3", status: "approved" as never, note: "", reviewer: "x", content_hash: "h" }),
    ).rejects.toThrow();
    await db.close();
  });

  it("file store behaves the same", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "vstore-"));
    await exercise(fileStore(path.join(dir, "v.json")));
  });
});

describe("effective status", () => {
  const doc = { hash: "abc", frontMatterVerified: false };
  const ev = (status: "verified" | "rejected" | "needs_changes", content_hash = "abc") => ({
    id: 1, source_id: "x", status, note: "", reviewer: "r", content_hash, created_at: "",
  });
  it("needs the reviewed text to match", () => {
    expect(effectiveStatus(doc, ev("verified"))).toBe("verified");
    expect(effectiveStatus(doc, ev("verified", "old"))).toBe("stale");
    expect(effectiveStatus(doc, ev("rejected"))).toBe("rejected");
    expect(effectiveStatus(doc, undefined)).toBe("unverified");
    expect(effectiveStatus({ ...doc, frontMatterVerified: true }, undefined)).toBe("verified");
  });
});

describe("retrieval uses lawyers' decisions", () => {
  afterEach(() => setStore(undefined));

  it("drops rejected sources and marks verified ones", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "vstore-"));
    const store = fileStore(path.join(dir, "v.json"));
    setStore(store);
    const base = new LocalFileRetriever(process.cwd(), 1.5);
    const q = { text: "I resigned in January 2026 after six years. Is gratuity payable?", domain: "employment" as const, k: 5 };
    const before = await base.search(q);
    const [first, second] = before;
    expect(first.doc.meta.verified).toBe(false);

    await store.record({ source_id: first.doc.meta.id, status: "rejected", note: "", reviewer: "l", content_hash: first.doc.hash });
    await store.record({ source_id: second.doc.meta.id, status: "verified", note: "", reviewer: "l", content_hash: contentHash(second.doc.body) });

    const withOverlay = new LocalFileRetriever(process.cwd(), 1.5, verificationOverlay);
    const after = await withOverlay.search(q);
    expect(after.map((p) => p.doc.meta.id)).not.toContain(first.doc.meta.id);
    expect(after.find((p) => p.doc.meta.id === second.doc.meta.id)?.doc.meta.verified).toBe(true);
  });
});
