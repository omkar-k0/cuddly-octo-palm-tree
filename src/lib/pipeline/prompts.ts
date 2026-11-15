import fs from "node:fs/promises";
import path from "node:path";
import { getDomain, type DomainId } from "@/config/domains";

const cache = new Map<string, Promise<string>>();

function read(rel: string): Promise<string> {
  let p = cache.get(rel);
  if (!p) {
    // Statically scoped to prompts/ so the bundler does not trace the whole project.
    p = fs.readFile(path.join(process.cwd(), "prompts", rel.replace(/^prompts\//, "")), "utf8");
    cache.set(rel, p);
  }
  return p;
}

export const loadClassifierPrompt = () => read("prompts/classifier.md");

/** Shared answer rules + the domain's own prompt. Stable per domain, so it caches. */
export async function loadAnswerSystemPrompt(domain: DomainId): Promise<string> {
  const d = getDomain(domain);
  if (!d) throw new Error(`unknown domain ${domain}`);
  const [base, own] = await Promise.all([read("prompts/answerer.md"), read(d.promptFile)]);
  return `${base.trim()}\n\n---\n\n${own.trim()}\n`;
}
