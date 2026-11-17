import crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SqlRunner } from "@/lib/db";
import { resetRateLimit } from "@/lib/onboarding/rate-limit";

/**
 * The route runs the real validation and the real repository; only the
 * database is faked (an in-memory table that enforces one open application
 * per email and country, like the real index). The real SQL is covered by
 * onboarding-applications.test.ts against PGlite.
 */
const dbState = vi.hoisted(() => ({ run: null as SqlRunner | null }));
vi.mock("@/lib/db", () => ({ getDb: async () => dbState.run }));

import { POST } from "@/app/api/lawyers/apply/route";

let rows: Record<string, unknown>[] = [];
const fakeDb: SqlRunner = async (text, params = []) => {
  if (!text.includes("INSERT INTO lawyer_applications")) throw new Error("unexpected statement");
  const [country, full_name, email, phone, bar_body, enrolment_number, enrolment_date, areas, jurisdictions, languages, version] = params as string[];
  if (rows.some((r) => r.email === email && r.country === country)) {
    throw Object.assign(new Error("duplicate key value violates unique constraint"), { code: "23505" });
  }
  const row = {
    id: crypto.randomUUID(), country, status: "submitted", full_name, email, phone, bar_body, enrolment_number, enrolment_date,
    areas, jurisdictions, languages, documents: [], consent_privacy_version: version, consented_at: new Date(), submitted_at: new Date(),
    decided_at: null, decided_by: null, decision_reason: null, notes: [],
  };
  rows.push(row);
  return [row];
};

let ipCounter = 0;
let ip = "";

const body = (over: Record<string, unknown> = {}) => ({
  country: "IN",
  full_name: "Asha Rao",
  email: "asha.rao@example.in",
  phone: "+91 98765 43210",
  bar_body: "Bar Council of Delhi",
  enrolment_number: "D/1234/2015",
  enrolment_year: 2015,
  areas: ["employment"],
  jurisdictions: ["Delhi"],
  languages: ["English"],
  consent: true,
  company_website: "",
  started_at: 1_000_000,
  sent_at: 1_060_000,
  ...over,
});

const post = (payload: unknown, headers: Record<string, string> = {}, raw?: string) =>
  POST(
    new Request("https://dem-fragen.test/api/lawyers/apply", {
      method: "POST",
      headers: { "content-type": "application/json", "sec-fetch-site": "same-origin", "x-forwarded-for": ip, ...headers },
      body: raw ?? JSON.stringify(payload),
    }),
  );

beforeEach(() => {
  resetRateLimit();
  ip = `10.0.0.${++ipCounter}`;
  rows = [];
  dbState.run = fakeDb;
});

afterEach(() => {
  dbState.run = null;
  vi.restoreAllMocks();
});

describe("POST /api/lawyers/apply", () => {
  it("stores a valid application, normalising the email", async () => {
    const res = await post(body({ email: "Asha.Rao@Example.IN" }));
    expect(res.status).toBe(201);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ ok: true });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ email: "asha.rao@example.in", status: "submitted", enrolment_date: "2015-01-01" });
  });

  it("returns 400 with per-field messages for invalid input, and stores nothing", async () => {
    const res = await post(body({ enrolment_year: 2999, areas: [], consent: false }));
    expect(res.status).toBe(400);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const json = await res.json();
    expect(Object.keys(json.fields).sort()).toEqual(["areas", "consent", "enrolment_year"]);
    expect(rows).toHaveLength(0);
  });

  it("returns 400 for a body that is not JSON or not an object", async () => {
    expect((await post(null, {}, "{nope")).status).toBe(400);
    expect((await post(null, {}, "[1,2]")).status).toBe(400);
    expect((await post(null, {}, "null")).status).toBe(400);
  });

  it("answers a second open application from the same email exactly like a new one, and stores nothing", async () => {
    const first = await post(body());
    expect(first.status).toBe(201);
    const again = await post(body({ full_name: "Asha R." }));
    expect(again.status).toBe(201);
    expect(again.headers.get("cache-control")).toBe("no-store");
    expect(await again.json()).toEqual(await first.json());
    expect(rows).toHaveLength(1);
  });

  it("returns 503 when there is no database", async () => {
    dbState.run = null;
    const res = await post(body());
    expect(res.status).toBe(503);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("rejects a filled honeypot without storing anything", async () => {
    const res = await post(body({ company_website: "https://spam.example" }));
    expect(res.status).toBe(400);
    expect(JSON.stringify(await res.json())).not.toContain("spam.example");
    expect(rows).toHaveLength(0);
  });

  it("rejects a form filled in under three seconds, or without timing fields", async () => {
    expect((await post(body({ started_at: 1_000_000, sent_at: 1_002_999 }))).status).toBe(400);
    expect((await post(body({ started_at: undefined }))).status).toBe(400);
    expect((await post(body({ sent_at: "later" }))).status).toBe(400);
    expect(rows).toHaveLength(0);
    expect((await post(body({ started_at: 1_000_000, sent_at: 1_003_000 }))).status).toBe(201);
  });

  it("rejects cross-origin and non-JSON requests", async () => {
    expect((await post(body(), { "sec-fetch-site": "cross-site" })).status).toBe(403);
    expect((await post(body(), { "sec-fetch-site": "", origin: "https://evil.example" })).status).toBe(403);
    expect((await post(body(), { "content-type": "text/plain" })).status).toBe(415);
    expect(rows).toHaveLength(0);
  });

  it("rejects an oversized body", async () => {
    const res = await post(body({ full_name: "A".repeat(40_000) }));
    expect(res.status).toBe(413);
  });

  it("limits each IP to five applications an hour", async () => {
    for (let i = 0; i < 5; i++) {
      expect((await post(body({ email: `lawyer${i}@example.in` }))).status).toBe(201);
    }
    const limited = await post(body({ email: "lawyer5@example.in" }));
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0);
    // Another address is not affected.
    expect((await post(body({ email: "other@example.in" }), { "x-forwarded-for": "192.0.2.77" })).status).toBe(201);
  });

  it("never logs the request body", async () => {
    const spies = [vi.spyOn(console, "log"), vi.spyOn(console, "error"), vi.spyOn(console, "warn"), vi.spyOn(console, "info")];
    dbState.run = async () => {
      throw new Error("connection lost for asha.rao@example.in");
    };
    const res = await post(body());
    expect(res.status).toBe(500);
    const logged = JSON.stringify(spies.flatMap((s) => s.mock.calls));
    expect(logged).not.toContain("asha");
    expect(logged).not.toContain("Asha");
    expect(logged).not.toContain("98765");
  });
});
