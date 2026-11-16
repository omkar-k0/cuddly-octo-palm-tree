import { describe, expect, it } from "vitest";
import { applies, contextFromText, dateRange, mergeContext } from "@/lib/pipeline/context";
import { answerQuery } from "@/lib/pipeline/run";
import { LocalFileRetriever } from "@/lib/retrieval/local";
import type { SourceMeta } from "@/lib/retrieval/types";

const meta = (over: Partial<SourceMeta>): SourceMeta => ({
  id: "x", type: "statute", title: "t", act: "A", verified: false, keywords: [],
  jurisdiction: "central", provenance: "manual", ...over,
});

describe("dateRange", () => {
  it("expands partial dates", () => {
    expect(dateRange("2025")).toEqual(["2025-01-01", "2025-12-31"]);
    expect(dateRange("2024-02")).toEqual(["2024-02-01", "2024-02-29"]);
    expect(dateRange("2025-11-21")).toEqual(["2025-11-21", "2025-11-21"]);
  });
});

describe("applies", () => {
  const old = meta({ effective_until: "2025-11-20" });
  const code = meta({ effective_from: "2025-11-21" });
  const none = { event_date: null, state: null, local: null };
  it("picks the regime by event date", () => {
    expect(applies(old, { ...none, event_date: "2025-03" })).toBe(true);
    expect(applies(code, { ...none, event_date: "2025-03" })).toBe(false);
    expect(applies(old, { ...none, event_date: "2026-01-10" })).toBe(false);
    expect(applies(code, { ...none, event_date: "2026-01-10" })).toBe(true);
  });
  it("keeps both regimes when the date is unknown or spans the change", () => {
    expect(applies(old, none) && applies(code, none)).toBe(true);
    expect(applies(old, { ...none, event_date: "2025-11" }) && applies(code, { ...none, event_date: "2025-11" })).toBe(true);
  });
  it("applies state law only in that state, and local law only in that place", () => {
    const mh = meta({ jurisdiction: "state", state: "Maharashtra" });
    const pune = meta({ jurisdiction: "local", state: "Maharashtra", local: "Pune" });
    expect(applies(mh, none)).toBe(false);
    expect(applies(mh, { ...none, state: "Maharashtra" })).toBe(true);
    expect(applies(mh, { ...none, state: "Delhi" })).toBe(false);
    expect(applies(pune, { ...none, state: "Maharashtra", local: "Mumbai" })).toBe(false);
    expect(applies(pune, { ...none, state: "Maharashtra", local: "pune" })).toBe(true);
  });
});

describe("contextFromText", () => {
  const today = "2026-11-15";
  it.each([
    ["I was fired on 3 March 2025 in Pune", { event_date: "2025-03-03", state: "Maharashtra", local: "Pune" }],
    ["my landlord in Delhi won't return the deposit since June 2024", { event_date: "2024-06", state: "Delhi", local: null }],
    ["I resigned last year from a Bengaluru startup", { event_date: "2025", state: "Karnataka", local: "Bengaluru" }],
    ["My employer has not paid my salary", { event_date: null, state: null, local: null }],
  ])("%s", (text, expected) => expect(contextFromText(text, today)).toEqual(expected));

  it("lets form values win over text", () => {
    expect(mergeContext({ state: "Goa" }, { state: "Delhi", event_date: "2024" })).toEqual({ event_date: "2024", state: "Goa", local: null });
  });
});

describe("pipeline uses context (mock)", () => {
  const r = new LocalFileRetriever(process.cwd(), 1.5);
  const run = (q: string, context = {}) => answerQuery(q, { mode: "mock", today: "2026-11-15", retriever: r, context });

  it("uses the old Gratuity Act for a 2025 resignation", async () => {
    const { trace } = await run("I resigned in March 2025 after six years. Is gratuity payable?");
    expect(trace.retrieved.some((id) => id.startsWith("pgact-1972"))).toBe(true);
    expect(trace.retrieved.some((id) => id.includes("social-security"))).toBe(false);
  });

  it("uses the Code on Social Security for a 2026 resignation", async () => {
    const { trace } = await run("I resigned in January 2026 after six years. Is gratuity payable?");
    expect(trace.retrieved.some((id) => id.includes("social-security"))).toBe(true);
    expect(trace.retrieved.some((id) => id.startsWith("pgact-1972"))).toBe(false);
  });

  it("asks for the date when both regimes are in play", async () => {
    const { response } = await run("I resigned after six years. Is gratuity payable?");
    expect(response.missing_context).toContain("event_date");
  });

  it("uses Delhi rent law for a Delhi tenant, and asks for the state otherwise", async () => {
    const delhi = await run("My landlord wants to evict me from my rented flat. Can he recover possession?", { state: "Delhi" });
    expect(delhi.trace.retrieved.some((id) => id.includes("delhi-rent"))).toBe(true);
    expect(delhi.trace.retrieved.some((id) => id.includes("maharashtra"))).toBe(false);
    const unknown = await run("My landlord wants to evict me from my rented flat. Can he recover possession?");
    expect(unknown.trace.retrieved.some((id) => id.includes("rent-control"))).toBe(false);
    expect(unknown.response.missing_context).toContain("state");
  });
});
