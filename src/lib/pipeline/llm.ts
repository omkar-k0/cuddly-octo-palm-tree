import Anthropic from "@anthropic-ai/sdk";

/**
 * "live" calls Claude; "mock" uses local stand-ins. Mock is the default when
 * no key is configured, so the app runs without one.
 */
export function llmMode(): "live" | "mock" {
  const forced = process.env.LLM_MODE?.trim().toLowerCase();
  if (forced === "mock") return "mock";
  if (forced === "live") return "live";
  return process.env.ANTHROPIC_API_KEY ? "live" : "mock";
}

let client: Anthropic | undefined;

/** Server-side only. Reads ANTHROPIC_API_KEY from the environment. */
export function anthropic(): Anthropic {
  client ??= new Anthropic({ maxRetries: 2, timeout: 55_000 });
  return client;
}
