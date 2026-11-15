/**
 * Minimal client for India Code (indiacode.gov.in), which runs DSpace 7.
 * Uses the public REST API the site itself uses. Polite by default:
 * one request per second, on-disk cache, generic user agent.
 */
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const BASE = "https://indiacode.gov.in/server/api";
export const PUBLIC_BASE = "https://indiacode.gov.in";
const CACHE_DIR = path.join(process.cwd(), ".cache", "indiacode");
const USER_AGENT = "legal-first-info-research/0.1 (non-commercial source indexing)";
const MIN_INTERVAL_MS = 1000;

let last = 0;
async function politeFetch(url: string): Promise<unknown> {
  const key = crypto.createHash("sha1").update(url).digest("hex");
  const file = path.join(CACHE_DIR, `${key}.json`);
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    /* not cached */
  }
  const wait = last + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  for (let attempt = 1; attempt <= 4; attempt++) {
    last = Date.now();
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
      if (res.status >= 500 || res.status === 429) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status} for ${url}`), { fatal: true });
      const json = await res.json();
      await fs.mkdir(CACHE_DIR, { recursive: true });
      await fs.writeFile(file, JSON.stringify(json));
      return json;
    } catch (e) {
      if ((e as { fatal?: boolean }).fatal || attempt === 4) throw e;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
  throw new Error("unreachable");
}

type Md = Record<string, { value: string }[]>;
export interface IcItem {
  uuid: string;
  handle: string;
  name: string;
  md: Md;
}
export const mdv = (md: Md, k: string): string | undefined => md[k]?.[0]?.value;

async function search(query: string, collection: string, page = 0, size = 100) {
  const u = new URL(`${BASE}/discover/search/objects`);
  u.searchParams.set("query", query);
  u.searchParams.set("dsoType", "ITEM");
  u.searchParams.set("size", String(size));
  u.searchParams.set("page", String(page));
  u.searchParams.set("f.identifier_collection", `${collection},equals`);
  const d = (await politeFetch(u.toString())) as {
    _embedded: { searchResult: { page: { totalPages: number }; _embedded: { objects: { _embedded: { indexableObject: { uuid: string; handle: string; name: string; metadata: Md } } }[] } } };
  };
  const sr = d._embedded.searchResult;
  return {
    totalPages: sr.page.totalPages,
    items: sr._embedded.objects.map((o) => {
      const it = o._embedded.indexableObject;
      return { uuid: it.uuid, handle: it.handle, name: it.name, md: it.metadata } as IcItem;
    }),
  };
}

const normTitle = (s: string) => s.toLowerCase().replace(/^the\s+/, "").replace(/[^a-z0-9]/g, "");

/** Find an Act by its short title, for the centre or a named state. */
export async function findAct(title: string, state = "CENTRAL"): Promise<IcItem> {
  const { items } = await search(`"${title}"`, "ACT", 0, 50);
  const hit = items.find(
    (i) =>
      normTitle(mdv(i.md, "dc.title") ?? i.name) === normTitle(title) &&
      (mdv(i.md, "dc.identifier.state_name") ?? "").toLowerCase() === state.toLowerCase(),
  );
  if (!hit) throw new Error(`Act not found on India Code: ${title} (${state})`);
  return hit;
}

/** All sections of an Act, by India Code act_id. */
export async function sectionsOf(actId: string): Promise<IcItem[]> {
  const out: IcItem[] = [];
  let page = 0;
  let total = 1;
  while (page < total) {
    const r = await search(actId, "SECTION", page);
    total = r.totalPages;
    out.push(...r.items.filter((i) => mdv(i.md, "dc.identifier.act_id") === actId));
    page++;
  }
  return out;
}

/** India Code section HTML → plain text with paragraph breaks. */
export function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h\d)>/gi, "\n")
    .replace(/<sup[^>]*>(.*?)<\/sup>/gi, "[$1]")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;|&rsquo;|&lsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n)))
    .replace(/[ \t]+/g, " ")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n\n");
}
