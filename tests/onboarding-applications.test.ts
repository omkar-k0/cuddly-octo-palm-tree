import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import type { SqlRunner } from "@/lib/db";
import { migration003 } from "@/lib/db/migrations/003_lawyer_applications";
import {
  createApplication,
  DuplicateApplication,
  getApplication,
  listApplications,
  OnboardingUnavailable,
} from "@/lib/onboarding/applications";
import { parseApplication, type ApplicationInput } from "@/lib/onboarding/schema";

vi.mock("@/lib/db", () => ({ getDb: vi.fn(async () => null) }));

const NOW = new Date("2026-11-17T12:00:00Z");

const valid = (raw: Record<string, unknown>): ApplicationInput => {
  const r = parseApplication(raw, NOW);
  if (!r.ok) throw new Error(JSON.stringify(r.fields));
  return r.data;
};

const india = (over: Record<string, unknown> = {}) =>
  valid({
    country: "IN",
    full_name: "Asha Rao",
    email: "Asha.Rao@Example.in",
    phone: "+91 98765 43210",
    bar_body: "Bar Council of Delhi",
    enrolment_number: "D/1234/2015",
    enrolment_year: 2015,
    areas: ["employment", "corporate"],
    jurisdictions: ["Delhi", "Haryana"],
    languages: ["English", "Hindi"],
    consent: true,
    ...over,
  });

const germany = (over: Record<string, unknown> = {}) =>
  valid({
    country: "DE",
    full_name: "Jonas Weber",
    email: "jonas@example.de",
    phone: "+49 30 1234567",
    bar_body: "Rechtsanwaltskammer Berlin",
    admission_date: "2016-05-02",
    areas: ["technology-ip"],
    jurisdictions: ["Berlin"],
    languages: ["German"],
    consent: true,
    ...over,
  });

let db: PGlite;
let run: SqlRunner;

// One in-memory database per file (starting PGlite takes a few seconds); tables are emptied between tests.
beforeAll(async () => {
  db = new PGlite();
  run = async (text, params) => (await db.query<Record<string, unknown>>(text, params)).rows;
  for (const stmt of migration003.up) await run(stmt);
}, 60_000);

beforeEach(async () => {
  await run("TRUNCATE lawyer_applications");
});

afterAll(async () => {
  await db.close();
});

describe("lawyer applications repository (PGlite)", () => {
  it("runs migration 003 and gen_random_uuid() works", async () => {
    const [row] = await run("SELECT gen_random_uuid()::text AS id");
    expect(String(row.id)).toMatch(/^[0-9a-f-]{36}$/);
    const idx = await run("SELECT indexname FROM pg_indexes WHERE tablename = 'lawyer_applications' ORDER BY indexname");
    expect(idx.map((r) => r.indexname)).toEqual(
      expect.arrayContaining(["lawyer_applications_status_idx", "lawyer_applications_email_idx", "lawyer_applications_one_open_idx"]),
    );
  });

  it("stores an Indian application and reads it back", async () => {
    const a = await createApplication(india(), run);
    expect(a).toMatchObject({
      country: "IN",
      status: "submitted",
      full_name: "Asha Rao",
      email: "asha.rao@example.in",
      bar_body: "Bar Council of Delhi",
      enrolment_number: "D/1234/2015",
      enrolment_date: "2015-01-01",
      areas: ["employment", "corporate"],
      jurisdictions: ["Delhi", "Haryana"],
      languages: ["English", "Hindi"],
      documents: [],
      notes: [],
      decided_at: null,
      decided_by: null,
      decision_reason: null,
    });
    expect(a.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(a.consent_privacy_version).toBeTruthy();
    expect(Date.parse(a.consented_at)).not.toBeNaN();
    expect(Date.parse(a.submitted_at)).not.toBeNaN();
    expect(await getApplication(a.id, run)).toEqual(a);
  });

  it("stores a German application with no enrolment number and the admission date", async () => {
    const a = await createApplication(germany(), run);
    expect(a).toMatchObject({ country: "DE", enrolment_number: null, enrolment_date: "2016-05-02", bar_body: "Rechtsanwaltskammer Berlin" });
  });

  it("stores arrays as real jsonb, not as encoded strings", async () => {
    await createApplication(india(), run);
    const [row] = await run("SELECT jsonb_typeof(areas) AS t, jsonb_array_length(languages) AS n FROM lawyer_applications");
    expect(row).toEqual({ t: "array", n: 2 });
  });

  it("rejects a second open application for the same email and country, ignoring case", async () => {
    await createApplication(india(), run);
    await expect(createApplication(india({ email: "ASHA.RAO@example.in", full_name: "Someone Else" }), run)).rejects.toBeInstanceOf(DuplicateApplication);
    // Another country with the same email is fine.
    await expect(createApplication(germany({ email: "asha.rao@example.in" }), run)).resolves.toMatchObject({ country: "DE" });
  });

  it("allows a new application once the earlier one is no longer open", async () => {
    const first = await createApplication(india(), run);
    await run("UPDATE lawyer_applications SET status = 'under_review' WHERE id = $1", [first.id]);
    await expect(createApplication(india(), run)).rejects.toBeInstanceOf(DuplicateApplication);
    await run("UPDATE lawyer_applications SET status = 'rejected' WHERE id = $1", [first.id]);
    await expect(createApplication(india(), run)).resolves.toMatchObject({ status: "submitted" });
  });

  it("lists newest first and filters by country and status", async () => {
    const a = await createApplication(india(), run);
    const b = await createApplication(germany(), run);
    const c = await createApplication(india({ email: "second@example.in" }), run);
    await run("UPDATE lawyer_applications SET status = 'approved', submitted_at = now() - interval '1 day' WHERE id = $1", [a.id]);
    await run("UPDATE lawyer_applications SET submitted_at = now() - interval '1 hour' WHERE id = $1", [b.id]);

    expect((await listApplications({}, run)).map((x) => x.id)).toEqual([c.id, b.id, a.id]);
    expect((await listApplications({ country: "IN" }, run)).map((x) => x.id)).toEqual([c.id, a.id]);
    expect((await listApplications({ status: "approved" }, run)).map((x) => x.id)).toEqual([a.id]);
    expect((await listApplications({ country: "DE", status: "approved" }, run)).map((x) => x.id)).toEqual([]);
  });

  it("returns null for an unknown or malformed id", async () => {
    expect(await getApplication("00000000-0000-4000-8000-000000000000", run)).toBeNull();
    expect(await getApplication("not-a-uuid", run)).toBeNull();
    expect(await getApplication("1' OR '1'='1", run)).toBeNull();
  });

  it("enforces the table constraints in the database", async () => {
    await expect(
      run(
        `INSERT INTO lawyer_applications (country, full_name, email, phone, bar_body, enrolment_number, enrolment_date, areas, consent_privacy_version, consented_at)
         VALUES ('IN', 'A', 'a@x.in', '1', 'B', NULL, '2015-01-01', '[]', 'v', now())`,
      ),
    ).rejects.toThrow();
    await expect(
      run(
        `INSERT INTO lawyer_applications (country, status, full_name, email, phone, bar_body, enrolment_date, areas, consent_privacy_version, consented_at)
         VALUES ('DE', 'maybe', 'A', 'a@x.de', '1', 'B', '2015-01-01', '[]', 'v', now())`,
      ),
    ).rejects.toThrow();
  });
});

describe("without a database", () => {
  it("throws OnboardingUnavailable from every function", async () => {
    await expect(createApplication(india())).rejects.toBeInstanceOf(OnboardingUnavailable);
    await expect(listApplications()).rejects.toBeInstanceOf(OnboardingUnavailable);
    await expect(getApplication("00000000-0000-4000-8000-000000000000")).rejects.toBeInstanceOf(OnboardingUnavailable);
  });
});
