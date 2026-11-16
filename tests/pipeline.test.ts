import { describe, expect, it } from "vitest";
import { answerQuery } from "@/lib/pipeline/run";
import { LocalFileRetriever, loadDomainDocuments } from "@/lib/retrieval/local";
import { domains } from "@/config/domains";

describe("source library", () => {
  it("every employment seed parses", async () => {
    const docs = await loadDomainDocuments(process.cwd(), "employment");
    expect(docs.length).toBeGreaterThanOrEqual(8);
    expect(new Set(docs.map((d) => d.meta.id)).size).toBe(docs.length);
  });

  it("every domain has a prompt file", async () => {
    const fs = await import("node:fs/promises");
    for (const d of domains) await expect(fs.access(d.promptFile)).resolves.toBeUndefined();
  });

  it("retrieves the gratuity provision for a gratuity question", async () => {
    const r = new LocalFileRetriever(process.cwd(), 1.5);
    const hits = await r.search({ text: "I resigned after 6 years, is gratuity payable?", domain: "employment", k: 3 });
    expect(hits[0].doc.meta.id).toMatch(/gratuity|pgact/);
  });
});

describe("answerQuery (mock mode)", () => {
  const run = (q: string) => answerQuery(q, { mode: "mock", today: "2026-11-15" });

  it("answers an employment question with valid citations", async () => {
    const { response } = await run("I resigned after six years with my employer. Is gratuity payable to me?");
    expect(response.status).toBe("answered");
    expect(response.domain).toBe("employment");
    expect(response.citations.length).toBeGreaterThan(0);
    for (const c of response.citations) expect(c.act ?? c.case).toBeTruthy();
    expect(response.disclaimer).toMatch(/not legal advice/);
    expect(response.mode).toBe("mock");
  });

  it("scrubs PII and reports it", async () => {
    const { response } = await run("My name is Ravi Shah, phone 9876543210. My employer has not paid my salary.");
    expect(response.redactions.map((r) => r.type).sort()).toEqual(["name", "phone"]);
  });

  it("routes non-legal questions out of scope", async () => {
    const { response } = await run("What is a good recipe for paneer tikka at dinner?");
    expect(response.status).toBe("out_of_scope");
    expect(response.citations).toEqual([]);
  });

  it("returns unverifiable when nothing is retrieved", async () => {
    const empty = { search: async () => [] };
    const { response } = await answerQuery("My landlord will not return my security deposit after I moved out of the flat.", {
      mode: "mock",
      today: "2026-11-15",
      retriever: empty,
    });
    expect(response.domain).toBe("real-estate");
    expect(response.status).toBe("unverifiable");
    expect(response.summary).toMatch(/^Unverifiable/);
    expect(response.escalate).toBe(true);
  });

  it("escalates criminal and urgent matters", async () => {
    const { response } = await run("My employer filed a police FIR against me and I was terminated. I must reply to the notice by tomorrow.");
    expect(response.escalate).toBe(true);
    expect(response.escalation_reasons).toEqual(expect.arrayContaining(["criminal_matter", "deadline_under_7_days"]));
  });
});
