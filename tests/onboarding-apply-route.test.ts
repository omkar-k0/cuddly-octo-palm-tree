import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import type { SqlRunner } from "@/lib/db";
import { migration003 } from "@/lib/db/migrations/003_lawyer_applications";
import { resetRateLimit } from "@/lib/onboarding/rate-limit";

const dbState = vi.hoisted(() => ({ run: null as SqlRunner | null }));
vi.mock("@/lib/db", () => ({ getDb: async () => dbState.run }));

import { POST } from "@/app/api/lawyers/apply/route";

let db: PGlite | undefined;
let ipCounter = 0;

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

let ip = "";
const post = (payload: unknown, headers: Record<string, string> = {}, raw?: string) =>
  POST(
    new Request("https://dem-fragen.test/api/lawyers/apply", {
      method: "POST",
      headers: { "content-type": "application/json", "sec-fetch-site": "same-origin", "x-forwarded-for": ip, ...headers },
      body: raw ?? JSON.stringify(payload),
    }),
  );

beforeEach(async () => {
  resetRateLimit();
  ip = `10.0.0.${++ipCounter}`;
  db = new PGlite();
  const pg = db;
  dbState.run = async (text, params) => (await pg.query<Record<string, unknown>>(text, params)).rows;
  for (const stmt of migration003.up) await dbState.run(stmt);
});

afterEach(async () => {
  dbState.run = null;
  await db?.close();
  vi.restoreAllMocks();
});

const count = async () => Number((await dbState.run!("SELECT count(*) AS n FROM lawyer_applications"))[0].n);

describe("POST /api/lawyers/apply", () => {
  it("stores a valid application, normalising the email", async () => {
    const res = await post(body({ email: "Asha.Rao@Example.IN" }));
    expect(res.status).toBe(201);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ ok: true });
    const [row] = await dbState.run!("SELECT email, status FROM lawyer_applications");
    expect(row).toEqual({ email: "asha.rao@example.in", status: "submitted" });
  });

  it("returns 400 with per-field messages for invalid input, and stores nothing", async () => {
    const res = await post(body({ enrolment_year: 2999, areas: [], consent: false }));
    expect(res.status).toBe(400);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const json = await res.json();
    expect(Object.keys(json.fields).sort()).toEqual(["areas", "consent", "enrolment_year"]);
    expect(await count()).toBe(0);
  });

  it("returns 400 for a body that is not JSON or not an object", async () => {
    expect((await post(null, {}, "{nope")).status).toBe(400);
    expect((await post(null, {}, "[1,2]")).status).toBe(400);
    expect((await post(null, {}, "null")).status).toBe(400);
  });

  it("returns 409 for a second open application from the same email", async () => {
    expect((await post(body())).status).toBe(201);
    const again = await post(body({ full_name: "Asha R." }));
    expect(again.status).toBe(409);
    expect(again.headers.get("cache-control")).toBe("no-store");
    expect(await count()).toBe(1);
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
    expect(await count()).toBe(0);
  });

  it("rejects a form filled in under three seconds, or without timing fields", async () => {
    expect((await post(body({ started_at: 1_000_000, sent_at: 1_002_999 }))).status).toBe(400);
    expect((await post(body({ started_at: undefined }))).status).toBe(400);
    expect((await post(body({ sent_at: "later" }))).status).toBe(400);
    expect(await count()).toBe(0);
    expect((await post(body({ started_at: 1_000_000, sent_at: 1_003_000 }))).status).toBe(201);
  });

  it("rejects cross-origin and non-JSON requests", async () => {
    expect((await post(body(), { "sec-fetch-site": "cross-site" })).status).toBe(403);
    expect((await post(body(), { "sec-fetch-site": "", origin: "https://evil.example" })).status).toBe(403);
    expect((await post(body(), { "content-type": "text/plain" })).status).toBe(415);
    expect(await count()).toBe(0);
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
