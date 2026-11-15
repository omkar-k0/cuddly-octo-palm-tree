/**
 * Eval runner. Usage: npm run eval -- [--file path] [--mode live|mock]
 *                                     [--concurrency n] [--limit n] [--write-readme]
 */
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { domainIds, OUT_OF_SCOPE } from "../src/config/domains";
import { confidenceBands } from "../src/config/gating";
import { llmMode } from "../src/lib/pipeline/llm";
import { answerQuery } from "../src/lib/pipeline/run";
import type { AnswerResponse, Citation } from "../src/lib/pipeline/types";

const Item = z.object({
  id: z.string(),
  question: z.string().min(1),
  expected_domain: z.enum([...domainIds, OUT_OF_SCOPE]),
  expected_escalate: z.boolean(),
  expected_citations: z
    .array(z.union([z.object({ act: z.string(), section: z.string().optional() }), z.object({ case: z.string() })]))
    .optional()
    .default([]),
  note: z.string().optional(),
});
type Item = z.infer<typeof Item>;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const normSection = (s: string) => norm(s.replace(/^(section|sec\.?|s\.)\s*/i, ""));

export function citationMatches(expected: Item["expected_citations"][number], got: Citation): boolean {
  if ("case" in expected) return !!got.case && norm(got.case).includes(norm(expected.case));
  if (!got.act || !norm(got.act).includes(norm(expected.act))) return false;
  if (!expected.section) return true;
  return !!got.section && normSection(got.section).startsWith(normSection(expected.section));
}

interface Row {
  item: Item;
  response?: AnswerResponse;
  predicted_route?: string;
  error?: string;
  routing_ok: boolean;
  escalate_ok: boolean;
  citation_hit: boolean | null;
  correct: boolean;
}

async function main() {
  const file = arg("file") ?? "eval/questions.jsonl";
  const mode = (arg("mode") as "live" | "mock" | undefined) ?? llmMode();
  const concurrency = Number(arg("concurrency") ?? 3);
  const limit = arg("limit") ? Number(arg("limit")) : undefined;

  let raw: string;
  try {
    raw = await fs.readFile(file, "utf8");
  } catch {
    console.error(`No eval file at ${file}. See eval/README.md.`);
    process.exit(1);
  }
  const items = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l, i) => {
      const r = Item.safeParse(JSON.parse(l));
      if (!r.success) throw new Error(`line ${i + 1}: ${r.error.issues.map((x) => x.message).join("; ")}`);
      return r.data;
    })
    .slice(0, limit);

  if (mode === "live" && !process.env.ANTHROPIC_API_KEY) {
    console.error("Live mode needs ANTHROPIC_API_KEY.");
    process.exit(1);
  }
  console.log(`Running ${items.length} questions from ${file} in ${mode} mode…`);

  const rows: Row[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.max(1, concurrency) }, async () => {
      while (next < items.length) {
        const i = next++;
        const item = items[i];
        try {
          const { response, trace } = await answerQuery(item.question, { mode });
          const routing_ok = trace.classification.route === item.expected_domain;
          const escalate_ok = response.escalate === item.expected_escalate;
          const citation_hit = item.expected_citations.length
            ? item.expected_citations.some((e) => response.citations.some((c) => citationMatches(e, c)))
            : null;
          rows[i] = {
            item,
            response,
            predicted_route: trace.classification.route,
            routing_ok,
            escalate_ok,
            citation_hit,
            correct: routing_ok && escalate_ok && citation_hit !== false,
          };
        } catch (e) {
          rows[i] = { item, error: (e as Error).message, routing_ok: false, escalate_ok: false, citation_hit: null, correct: false };
        }
        process.stdout.write(rows[i].error ? "E" : rows[i].correct ? "." : "x");
      }
    }),
  );
  process.stdout.write("\n");

  const md = report(rows, mode, file);
  console.log("\n" + md);
  await fs.mkdir("eval/results", { recursive: true });
  await fs.writeFile("eval/results/latest.md", md);
  await fs.writeFile(
    "eval/results/latest.json",
    JSON.stringify(
      rows.map((r) => ({
        id: r.item.id,
        expected_domain: r.item.expected_domain,
        predicted_route: r.predicted_route,
        status: r.response?.status,
        confidence: r.response?.confidence,
        escalate: r.response?.escalate,
        expected_escalate: r.item.expected_escalate,
        escalation_reasons: r.response?.escalation_reasons,
        citations: r.response?.citations.map((c) => c.source_id),
        citation_hit: r.citation_hit,
        correct: r.correct,
        error: r.error,
      })),
      null,
      2,
    ),
  );

  if (flag("write-readme")) {
    if (mode !== "live") {
      console.error("Refusing to write mock results into README. Run with --mode live.");
      process.exit(1);
    }
    const readme = await fs.readFile("README.md", "utf8");
    const start = "<!-- EVAL:START -->";
    const end = "<!-- EVAL:END -->";
    if (!readme.includes(start) || !readme.includes(end)) throw new Error("README is missing the EVAL markers");
    const updated = readme.replace(new RegExp(`${start}[\\s\\S]*${end}`), `${start}\n${md}\n${end}`);
    await fs.writeFile("README.md", updated);
    console.log("README.md updated.");
  }
}

const pct = (n: number, d: number) => (d === 0 ? "n/a" : `${((100 * n) / d).toFixed(1)}% (${n}/${d})`);

export function report(rows: Row[], mode: string, file: string): string {
  const ok = rows.filter((r) => r.response);
  const n = rows.length;
  const answered = ok.filter((r) => r.response!.status === "answered");
  const inScope = rows.filter((r) => r.item.expected_domain !== OUT_OF_SCOPE);
  const inScopeCited = inScope.filter((r) => r.response?.status === "answered" && r.response.citations.length > 0);
  const withExpected = rows.filter((r) => r.citation_hit !== null);
  const auto = ok.filter((r) => r.response!.status === "answered" && !r.response!.escalate);

  const lines = [
    `Run: ${new Date().toISOString().slice(0, 10)}, ${mode} mode, ${n} questions (\`${path.basename(file)}\`)${
      rows.some((r) => r.error) ? `, ${rows.filter((r) => r.error).length} errors` : ""
    }`,
    "",
    "| Metric | Result |",
    "|---|---|",
    `| Routing accuracy | ${pct(rows.filter((r) => r.routing_ok).length, n)} |`,
    `| Citation presence (answered with ≥1 valid citation) | ${pct(answered.filter((r) => r.response!.citations.length > 0).length, answered.length)} |`,
    `| In-scope questions given a cited answer | ${pct(inScopeCited.length, inScope.length)} |`,
    `| Expected-citation hit rate | ${pct(withExpected.filter((r) => r.citation_hit).length, withExpected.length)} |`,
    `| Escalation agreement | ${pct(rows.filter((r) => r.escalate_ok).length, n)} |`,
    `| Auto-handled (answered, not escalated) | ${pct(auto.length, n)} |`,
    `| Overall accuracy | ${pct(rows.filter((r) => r.correct).length, n)} |`,
    "",
    "| Confidence band | Questions | Accuracy |",
    "|---|---|---|",
    ...confidenceBands.map((b) => {
      const inBand = ok.filter((r) => r.response!.confidence >= b.min && r.response!.confidence < b.max);
      return `| ${b.label} (${b.min.toFixed(1)}–${Math.min(1, b.max).toFixed(1)}) | ${inBand.length} | ${pct(
        inBand.filter((r) => r.correct).length,
        inBand.length,
      )} |`;
    }),
  ];
  return lines.join("\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
