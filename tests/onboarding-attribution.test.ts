import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnswerDraft } from "@/lib/pipeline/answer";
import { gate } from "@/lib/pipeline/gate";
import { reviewerLabel, reviewerLabelForUser } from "@/lib/onboarding/attribution";
import { LocalFileRetriever } from "@/lib/retrieval/local";
import type { VerificationEvent } from "@/lib/admin/store";
import type { Passage } from "@/lib/retrieval";

// The toggle is a constant in config; tests flip it through a mock.
const state = vi.hoisted(() => ({ mode: "anonymous" as "anonymous" | "named" }));
vi.mock("@/config/reviewers", () => ({
  get REVIEWER_ATTRIBUTION() {
    return state.mode;
  },
}));

const getUser = vi.hoisted(() => vi.fn());
vi.mock("@/lib/accounts", () => ({ getUser }));

beforeEach(() => {
  state.mode = "anonymous";
  getUser.mockReset();
  getUser.mockRejectedValue(new Error("accounts: not implemented yet"));
});

describe("reviewerLabel", () => {
  it("is null when reviewers are anonymous", () => {
    expect(reviewerLabel({ reviewerName: "Asha Rao", country: "IN" }, "anonymous")).toBeNull();
    expect(reviewerLabel({ reviewerName: "Asha Rao", country: "DE" }, "anonymous")).toBeNull();
    // The configured default is anonymous.
    expect(reviewerLabel({ reviewerName: "Asha Rao", country: "IN" })).toBeNull();
  });

  it("is Adv. <name> for India and RA <name> for Germany when named", () => {
    expect(reviewerLabel({ reviewerName: "Asha Rao", country: "IN" }, "named")).toBe("Adv. Asha Rao");
    expect(reviewerLabel({ reviewerName: "  Jonas Weber ", country: "DE" }, "named")).toBe("RA Jonas Weber");
  });

  it("is null for a missing or blank name", () => {
    expect(reviewerLabel({ reviewerName: null, country: "IN" }, "named")).toBeNull();
    expect(reviewerLabel({ reviewerName: "   ", country: "DE" }, "named")).toBeNull();
  });

  it("follows the configured mode when none is passed", () => {
    state.mode = "named";
    expect(reviewerLabel({ reviewerName: "Asha Rao", country: "IN" })).toBe("Adv. Asha Rao");
  });
});

describe("reviewerLabelForUser", () => {
  it("does not look anyone up in anonymous mode", async () => {
    const lookup = vi.fn();
    expect(await reviewerLabelForUser("u1", "anonymous", lookup)).toBeNull();
    expect(lookup).not.toHaveBeenCalled();
  });

  it("names the reviewer, treating a user without a country as Indian", async () => {
    const lookup = vi.fn(async (id: string) => (id === "de" ? { name: "Jonas Weber", country: "DE" as const } : { name: "Asha Rao", country: null }));
    expect(await reviewerLabelForUser("de", "named", lookup)).toBe("RA Jonas Weber");
    expect(await reviewerLabelForUser("in", "named", lookup)).toBe("Adv. Asha Rao");
  });

  it("falls back to null when the user is unknown or the lookup throws", async () => {
    expect(await reviewerLabelForUser("u1", "named", async () => null)).toBeNull();
    expect(await reviewerLabelForUser("u1", "named", async () => Promise.reject(new Error("boom")))).toBeNull();
    expect(await reviewerLabelForUser(null, "named", async () => ({ name: "x", country: "IN" }))).toBeNull();
  });
});

const passage = (id: string, verified: boolean, reviewed_by?: string | null): Passage => ({
  score: 5,
  doc: {
    domain: "employment",
    path: `sources/employment/${id}.md`,
    body: "text",
    hash: "h",
    meta: { id, type: "statute", title: id, act: "Some Act", section: "Section 4", verified, keywords: [], jurisdiction: "central", provenance: "manual", reviewed_by },
  },
});

const draft: AnswerDraft = {
  unverifiable: false,
  summary: "A [S1]. B [S2]. C [S3].",
  steps: [],
  citations: [
    { label: "S1", pinpoint: null },
    { label: "S2", pinpoint: null },
    { label: "S3", pinpoint: null },
  ],
  confidence: 0.9,
  deadline_days: null,
  follow_ups: [],
};

describe("gate passes the reviewer label through", () => {
  it("sets reviewed_by on verified citations only", () => {
    const g = gate({
      draft,
      passages: [passage("a", true, "Adv. Asha Rao"), passage("b", true), passage("c", false, "Adv. Stale Name")],
      criminal: false,
      deadline_days: null,
    });
    expect(g.citations.map((c) => [c.source_id, c.verified, c.reviewed_by])).toEqual([
      ["a", true, "Adv. Asha Rao"],
      ["b", true, null],
      ["c", false, null],
    ]);
  });
});

describe("retrieval sets reviewed_by from the verification overlay", () => {
  const q = { text: "I resigned in January 2026 after six years. Is gratuity payable?", domain: "employment" as const, k: 5 };
  const event = (source_id: string, content_hash: string, reviewer_user_id: string | null): VerificationEvent =>
    ({ id: 1, source_id, status: "verified", note: "", reviewer: "l@x.in", content_hash, created_at: "", reviewer_user_id }) as VerificationEvent;

  async function overlayFor(userId: string | null) {
    const base = await new LocalFileRetriever(process.cwd(), 1.5).search(q);
    const first = base[0].doc;
    const map = new Map([[first.meta.id, event(first.meta.id, first.hash, userId)]]);
    return { id: first.meta.id, retriever: new LocalFileRetriever(process.cwd(), 1.5, async () => map) };
  }

  it("never reads accounts and sets no name in anonymous mode", async () => {
    const { id, retriever } = await overlayFor("u1");
    const hits = await retriever.search(q);
    const hit = hits.find((h) => h.doc.meta.id === id)!;
    expect(hit.doc.meta.verified).toBe(true);
    expect(hit.doc.meta.reviewed_by ?? null).toBeNull();
    expect(getUser).not.toHaveBeenCalled();
  });

  it("names the reviewer of a verified source in named mode", async () => {
    state.mode = "named";
    getUser.mockResolvedValue({ name: "Asha Rao", country: "IN" });
    const { id, retriever } = await overlayFor("u1");
    const hits = await retriever.search(q);
    expect(hits.find((h) => h.doc.meta.id === id)!.doc.meta.reviewed_by).toBe("Adv. Asha Rao");
    expect(hits.filter((h) => h.doc.meta.id !== id).every((h) => !h.doc.meta.reviewed_by)).toBe(true);
    expect(getUser).toHaveBeenCalledTimes(1);
    expect(getUser).toHaveBeenCalledWith("u1");
  });

  it("falls back to plain verified when the lookup fails or there is no reviewer account", async () => {
    state.mode = "named";
    const failing = await overlayFor("u1"); // getUser rejects by default
    const hit = (await failing.retriever.search(q)).find((h) => h.doc.meta.id === failing.id)!;
    expect(hit.doc.meta.verified).toBe(true);
    expect(hit.doc.meta.reviewed_by ?? null).toBeNull();

    getUser.mockClear();
    const legacy = await overlayFor(null);
    const legacyHit = (await legacy.retriever.search(q)).find((h) => h.doc.meta.id === legacy.id)!;
    expect(legacyHit.doc.meta.reviewed_by ?? null).toBeNull();
    expect(getUser).not.toHaveBeenCalled();
  });
});
