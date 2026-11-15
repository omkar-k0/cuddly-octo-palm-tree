/**
 * Fetch the sections listed in manifest.ts from India Code and write them to
 * sources/<domain>/ic-*.md. Everything is written with verified: false; a
 * lawyer flips it after checking. Re-running overwrites ic-* files only.
 *
 *   npm run scrape                # all
 *   npm run scrape -- --domain employment
 */
import fs from "node:fs/promises";
import path from "node:path";
import { findAct, htmlToText, mdv, PUBLIC_BASE, sectionsOf, type IcItem } from "./indiacode";
import { manifest, type ManifestEntry } from "./manifest";

const today = new Date().toISOString().slice(0, 10);
const onlyDomain = (() => {
  const i = process.argv.indexOf("--domain");
  return i >= 0 ? process.argv[i + 1] : undefined;
})();

function slug(s: string) {
  return s
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .split("-")
    .filter((w) => !["of", "and", "act", "the", "for", "on"].includes(w))
    .slice(0, 4)
    .join("-");
}

function enforcementLine(act: IcItem): string | undefined {
  const h = mdv(act.md, "dc.legislation.history");
  if (!h) return;
  const text = htmlToText(h).replace(/\s+/g, " ");
  const i = text.search(/Enforcement Date/i);
  if (i < 0) return;
  let tail = text.slice(i).replace(/^Enforcement Date\s*[-–:]?\s*/i, "");
  const stop = tail.search(/Administrative|Nodal Ministry|Precedent|Official Gazette|Parliamentary/i);
  if (stop > 0) tail = tail.slice(0, stop);
  return tail.replace(/[●•]/g, "").trim().slice(0, 600) || undefined;
}

/** "THE KARNATAKA RENT ACT, 1999." → "The Karnataka Rent Act, 1999" */
function tidyTitle(t: string) {
  let s = t.trim().replace(/\.$/, "");
  if (s === s.toUpperCase()) {
    s = s.toLowerCase().replace(/\b([a-z])/g, (c) => c.toUpperCase()).replace(/\b(Of|And|The|For|On|In|To)\b/g, (w) => w.toLowerCase());
    s = s.charAt(0).toUpperCase() + s.slice(1);
  }
  return s;
}

const yaml = (v: string) => JSON.stringify(v); // JSON strings are valid YAML scalars

async function writeEntry(e: ManifestEntry) {
  const act = await findAct(e.act, e.lookupAs ?? e.state ?? "CENTRAL");
  const actId = mdv(act.md, "dc.identifier.act_id")!;
  const actTitle = tidyTitle(mdv(act.md, "dc.title") ?? e.act);
  const enforcement = enforcementLine(act);
  const all = await sectionsOf(actId);
  const wanted = all.filter((s) => {
    const num = mdv(s.md, "dc.identifier.section_number") ?? "";
    if (e.sections) return e.sections.map((x) => x.toLowerCase()).includes(num.toLowerCase());
    return e.titleMatch ? e.titleMatch.test(mdv(s.md, "dc.title") ?? s.name) : false;
  });
  if (e.sections) {
    const got = new Set(wanted.map((s) => (mdv(s.md, "dc.identifier.section_number") ?? "").toLowerCase()));
    const missing = e.sections.filter((x) => !got.has(x.toLowerCase()));
    if (missing.length) console.warn(`  ! ${actTitle}: sections not found: ${missing.join(", ")}`);
  }
  const dir = path.join("sources", e.domain);
  await fs.mkdir(dir, { recursive: true });
  let written = 0;
  for (const s of wanted) {
    const num = mdv(s.md, "dc.identifier.section_number") ?? "";
    const heading = (mdv(s.md, "dc.title") ?? s.name).replace(/\.$/, "");
    const raw = mdv(s.md, "dc.identifier.section_page_note") ?? "";
    const body = htmlToText(raw);
    if (body.length < 20) {
      console.warn(`  ! ${actTitle} s.${num}: empty text, skipped`);
      continue;
    }
    const id = `ic-${slug(actTitle)}${e.state ? `-${slug(e.state)}` : ""}-s${num.toLowerCase()}`;
    const fm = [
      "---",
      `id: ${id}`,
      "type: statute",
      `title: ${yaml(heading)}`,
      `act: ${yaml(actTitle)}`,
      `section: ${yaml(`Section ${num}`)}`,
      `source_url: ${PUBLIC_BASE}/handle/${s.handle}`,
      "verified: false",
      `last_checked: ${today}`,
      `keywords: ${JSON.stringify(e.keywords)}`,
      `jurisdiction: ${e.state ? "state" : "central"}`,
      e.state ? `state: ${yaml(e.state)}` : null,
      e.effective_from ? `effective_from: ${e.effective_from}` : null,
      e.effective_until ? `effective_until: ${e.effective_until}` : null,
      "provenance: indiacode",
      `act_id: ${actId}`,
      `scraped_at: ${today}`,
      enforcement ? `enforcement_note: ${yaml(enforcement)}` : null,
      e.note ? `note: ${yaml(e.note)}` : null,
      "---",
    ].filter((l) => l !== null);
    await fs.writeFile(path.join(dir, `${id}.md`), `${fm.join("\n")}\n${body}\n`);
    written++;
  }
  console.log(`  ${actTitle}${e.state ? ` (${e.state})` : ""}: ${written} sections${enforcement ? `\n    enforcement: ${enforcement.slice(0, 160)}` : ""}`);
}

async function main() {
  const entries = manifest.filter((e) => !onlyDomain || e.domain === onlyDomain);
  for (const e of entries) {
    try {
      await writeEntry(e);
    } catch (err) {
      console.error(`  x ${e.act}: ${(err as Error).message}`);
    }
  }
}

main();
