import { normaliseState, placeToState, states, type StateName } from "@/config/jurisdictions";
import type { SourceMeta } from "@/lib/retrieval/types";

/**
 * Facts that decide WHICH law applies: when the events happened, and where.
 * They come from the form (if the user filled it) or are read from the text.
 */
export interface QueryContext {
  /** "YYYY-MM-DD", "YYYY-MM" or "YYYY". Null when unknown. */
  event_date: string | null;
  state: StateName | null;
  /** City, district or village, free text. */
  local: string | null;
}

export const emptyContext: QueryContext = { event_date: null, state: null, local: null };

/** Turn a partial date into the inclusive range it covers. */
export function dateRange(d: string): [string, string] {
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return [d, d];
  if (/^\d{4}-\d{2}$/.test(d)) {
    const [y, m] = d.split("-").map(Number);
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return [`${d}-01`, `${d}-${String(last).padStart(2, "0")}`];
  }
  if (/^\d{4}$/.test(d)) return [`${d}-01-01`, `${d}-12-31`];
  return ["0000-01-01", "9999-12-31"];
}

/** Does this source apply to the user's situation? */
export function applies(meta: SourceMeta, ctx: QueryContext): boolean {
  // Where: central law always; state law only for the user's state; local law only for their place.
  if (meta.jurisdiction !== "central") {
    if (!ctx.state || normaliseState(meta.state) !== ctx.state) return false;
    if (meta.jurisdiction === "local") {
      if (!ctx.local || !meta.local || meta.local.toLowerCase() !== ctx.local.trim().toLowerCase()) return false;
    }
  }
  // When: the law's period must overlap the period the events fall in.
  if (ctx.event_date) {
    const [start, end] = dateRange(ctx.event_date);
    if (meta.effective_from && end < meta.effective_from) return false;
    if (meta.effective_until && start > meta.effective_until) return false;
  }
  return true;
}

const MONTHS = ["january","february","march","april","may","june","july","august","september","october","november","december"];

/**
 * Read a date and place from free text (mock mode, and a backstop for the
 * live classifier). Conservative: only clear mentions count.
 */
export function contextFromText(text: string, today: string): QueryContext {
  const t = text.toLowerCase();

  // Date: "on 3 March 2025", "in March 2025", "in 2024", "last year", "last month".
  let event_date: string | null = null;
  const dm = /\b(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)[,]?\s+(20\d{2}|19\d{2})\b/.exec(t);
  const my = /\b(january|february|march|april|may|june|july|august|september|october|november|december)[,]?\s+(20\d{2}|19\d{2})\b/.exec(t);
  const y = /\b(?:in|since|from|during|year|of)\s+(20\d{2}|19\d{2})\b/.exec(t);
  if (dm) event_date = `${dm[3]}-${String(MONTHS.indexOf(dm[2]) + 1).padStart(2, "0")}-${dm[1].padStart(2, "0")}`;
  else if (my) event_date = `${my[2]}-${String(MONTHS.indexOf(my[1]) + 1).padStart(2, "0")}`;
  else if (y) event_date = y[1];
  else if (/\b(last|this|past) (week|few days)\b|\b(yesterday|today|recently|just now)\b/.test(t)) event_date = today;
  else if (/\blast month\b/.test(t)) event_date = today.slice(0, 7);
  else if (/\blast year\b/.test(t)) event_date = String(Number(today.slice(0, 4)) - 1);

  // Place: a state name, or a known city.
  let state: StateName | null = null;
  let local: string | null = null;
  for (const s of states) {
    if (new RegExp(`\\b${s.toLowerCase()}\\b`).test(t)) {
      state = s;
      break;
    }
  }
  for (const [place, st] of Object.entries(placeToState)) {
    if (new RegExp(`\\b${place}\\b`).test(t)) {
      state ??= st;
      if (place !== st.toLowerCase()) local = place.replace(/\b\w/g, (c) => c.toUpperCase());
      break;
    }
  }
  return { event_date, state, local };
}

/** User-entered values win; otherwise take what the model or the rules found. */
export function mergeContext(...sources: Partial<QueryContext>[]): QueryContext {
  const out: QueryContext = { ...emptyContext };
  for (const s of sources) {
    out.event_date ??= s.event_date ?? null;
    out.state ??= normaliseState(s.state ?? null);
    out.local ??= s.local?.trim() || null;
  }
  return out;
}
