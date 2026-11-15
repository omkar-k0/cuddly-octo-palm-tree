"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, ArrowUpRight, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getDomain } from "@/config/domains";
import { bandFor } from "@/config/gating";
import { redactionLabels } from "@/lib/privacy/scrub";
import type { AnswerResponse, Citation, EscalationReason, MissingContext } from "@/lib/pipeline/types";
import { cn } from "@/lib/utils";

const reasonText: Record<EscalationReason, string> = {
  criminal_matter: "This may involve a criminal matter or the police.",
  deadline_under_7_days: "You mention a deadline less than seven days away.",
  low_confidence: "Our sources do not settle this with enough confidence.",
  model_declined: "We could not prepare an answer for this question.",
};

/** Renders "text [1] more [2]" with clickable citation markers. */
function Cited({ text, onCite }: { text: string; onCite: (n: number) => void }) {
  const parts = text.split(/(\[\d+\])/g);
  return (
    <>
      {parts.map((part, i) => {
        const m = /^\[(\d+)\]$/.exec(part);
        if (!m) return <React.Fragment key={i}>{part}</React.Fragment>;
        const n = Number(m[1]);
        return (
          <button
            key={i}
            type="button"
            onClick={() => onCite(n)}
            className="mx-0.5 inline-flex h-[1.15rem] min-w-[1.15rem] -translate-y-[0.35em] items-center justify-center rounded-full border border-accent/40 bg-accent-soft px-1 align-baseline text-[0.62rem] font-semibold text-accent transition-colors hover:bg-accent hover:text-accent-foreground"
            aria-label={`Source ${n}`}
          >
            {n}
          </button>
        );
      })}
    </>
  );
}

function citationScope(c: Citation) {
  const where = c.jurisdiction === "central" ? null : c.local ? `${c.local}, ${c.state}` : c.state;
  const when = c.effective_from && c.effective_until
    ? `${c.effective_from} – ${c.effective_until}`
    : c.effective_from
      ? `From ${c.effective_from}`
      : c.effective_until
        ? `Until ${c.effective_until}`
        : null;
  return [where, when].filter(Boolean).join(" · ");
}

function citationHeading(c: Citation) {
  if (c.type === "judgment") return [c.case, c.court, c.year].filter(Boolean).join(", ");
  return [c.section, c.act].filter(Boolean).join(", ");
}

function Confidence({ value }: { value: number }) {
  const band = bandFor(value);
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="uppercase tracking-[0.12em] text-muted-foreground">Confidence</span>
        <span className="tabular-nums">
          {band.label} · {value.toFixed(2)}
        </span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted" role="meter" aria-valuemin={0} aria-valuemax={1} aria-valuenow={value} aria-label="Confidence">
        <div
          className={cn("h-full rounded-full", value >= 0.6 ? "bg-foreground" : "bg-accent")}
          style={{ width: `${Math.max(3, value * 100)}%` }}
        />
      </div>
    </div>
  );
}

function formatEventDate(d: string) {
  const [y, m] = d.split("-");
  if (!m) return y;
  return new Date(Date.UTC(Number(y), Number(m) - 1, 1)).toLocaleString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
}

const missingText: Record<MissingContext, string> = {
  event_date: "when this happened (some laws changed on 21 November 2025)",
  state: "which state and city this is in (state rules may apply)",
};

export function AnswerView({
  answer,
  onFollowUp,
  onAddContext,
}: {
  answer: AnswerResponse;
  onFollowUp: (q: string) => void;
  onAddContext?: () => void;
}) {
  const [active, setActive] = React.useState<number | null>(null);
  const refs = React.useRef(new Map<number, HTMLLIElement>());
  const domain = answer.domain ? getDomain(answer.domain) : undefined;

  const cite = (n: number) => {
    setActive(n);
    refs.current.get(n)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-12">
      <article className="min-w-0 space-y-8">
        <header className="flex flex-wrap items-center gap-2">
          {domain ? (
            <span className="font-serif text-lg">
              <span className="text-muted-foreground">{domain.number}</span> {domain.title}
            </span>
          ) : (
            <span className="font-serif text-lg text-muted-foreground">Outside our areas</span>
          )}
          {answer.status === "answered" && <Badge variant="verified">Cited answer</Badge>}
          {answer.status === "unverifiable" && <Badge variant="warning">Unverifiable</Badge>}
          {answer.status === "out_of_scope" && <Badge>Out of scope</Badge>}
          {answer.mode === "mock" && (
            <Badge variant="solid" title="No API key configured, or LLM_MODE=mock">
              Mock answer
            </Badge>
          )}
        </header>

        {answer.escalate && (
          <section className="rounded-lg border border-accent/40 bg-accent-soft p-5" aria-labelledby="escalate-h">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
              <div className="space-y-2">
                <h2 id="escalate-h" className="font-serif text-xl text-accent">
                  Speak to an advocate
                </h2>
                <ul className="space-y-1 text-sm">
                  {answer.escalation_reasons.map((r) => (
                    <li key={r}>{reasonText[r]}</li>
                  ))}
                </ul>
                <Link href="/find-an-advocate" className="inline-flex items-center gap-1 text-sm font-medium underline underline-offset-4">
                  How to find an advocate <ArrowUpRight className="size-3.5" aria-hidden />
                </Link>
              </div>
            </div>
          </section>
        )}

        {(answer.context.event_date || answer.context.state || answer.missing_context.length > 0) && answer.status !== "out_of_scope" && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-mono uppercase tracking-[0.1em] text-muted-foreground">Law applied</span>
            <Badge>{answer.context.event_date ? `Events in ${formatEventDate(answer.context.event_date)}` : "Date not given"}</Badge>
            <Badge>
              {answer.context.state
                ? `${answer.context.state}${answer.context.local ? ` · ${answer.context.local}` : ""}`
                : "Central law only"}
            </Badge>
          </div>
        )}

        {answer.missing_context.length > 0 && answer.status !== "out_of_scope" && (
          <div className="flex flex-col gap-3 rounded-xl border border-foreground/15 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p>
              A more precise answer needs {answer.missing_context.map((m) => missingText[m]).join(", and ")}.
            </p>
            {onAddContext && (
              <button
                type="button"
                onClick={onAddContext}
                className="shrink-0 rounded-full border border-foreground/30 px-3 py-1 text-xs font-medium hover:border-foreground"
              >
                Add date &amp; place
              </button>
            )}
          </div>
        )}

        <section aria-labelledby="summary-h">
          <h2 id="summary-h" className="sr-only">Summary</h2>
          <p className="font-serif text-[1.35rem] leading-relaxed sm:text-[1.5rem]">
            <Cited text={answer.summary} onCite={cite} />
          </p>
        </section>

        {answer.steps.length > 0 && (
          <section aria-labelledby="steps-h">
            <h2 id="steps-h" className="mb-4 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              What you can do
            </h2>
            <ol className="space-y-3">
              {answer.steps.map((s, i) => (
                <li key={i} className="grid grid-cols-[2rem_1fr] gap-2 border-t border-foreground/10 pt-3 leading-relaxed">
                  <span className="font-serif text-lg italic text-accent">{i + 1}.</span>
                  <span>
                    <Cited text={s} onCite={cite} />
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {answer.follow_ups.length > 0 && (
          <section aria-labelledby="follow-h">
            <h2 id="follow-h" className="mb-3 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Questions that would change the answer
            </h2>
            <div className="flex flex-col gap-2">
              {answer.follow_ups.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => onFollowUp(q)}
                  className="flex items-center justify-between gap-3 rounded-md border border-foreground/10 px-4 py-2.5 text-left text-sm transition-colors hover:border-foreground/40"
                >
                  {q} <span aria-hidden className="text-muted-foreground">+</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <p className="border-t border-foreground/10 pt-5 text-xs leading-relaxed text-muted-foreground">
          {answer.disclaimer}
        </p>
      </article>

      <aside className="min-w-0 space-y-6 lg:sticky lg:top-20 lg:self-start">
        <Confidence value={answer.confidence} />

        <section aria-labelledby="sources-h">
          <h2 id="sources-h" className="mb-3 text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Sources {answer.citations.length > 0 && `(${answer.citations.length})`}
          </h2>
          {answer.citations.length === 0 ? (
            <p className="rounded-md border border-dashed border-foreground/20 p-4 text-sm text-muted-foreground">
              No source in our library supports an answer to this question, so none is shown.
            </p>
          ) : (
            <ol className="space-y-2">
              {answer.citations.map((c) => (
                <li
                  key={c.n}
                  ref={(el) => {
                    if (el) refs.current.set(c.n, el);
                  }}
                  className={cn(
                    "rounded-md border p-4 text-sm transition-colors",
                    active === c.n ? "border-accent bg-accent-soft" : "border-foreground/10 bg-card",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-accent/40 text-[0.65rem] font-semibold text-accent">
                      {c.n}
                    </span>
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium leading-snug">{citationHeading(c)}</p>
                      {c.pinpoint && <p className="text-xs text-muted-foreground">at {c.pinpoint}</p>}
                      <p className="text-muted-foreground">{c.title}</p>
                      {citationScope(c) && <p className="font-mono text-[0.68rem] text-muted-foreground">{citationScope(c)}</p>}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {c.verified ? (
                          <Badge variant="verified">
                            <ShieldCheck className="size-3" aria-hidden /> Verified
                          </Badge>
                        ) : (
                          <Badge variant="warning">Pending verification</Badge>
                        )}
                        {c.source_url && (
                          <a
                            href={c.source_url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex items-center gap-0.5 text-xs underline underline-offset-4"
                          >
                            Official source <ArrowUpRight className="size-3" aria-hidden />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        {answer.redactions.length > 0 && (
          <p className="rounded-md bg-muted p-4 text-xs leading-relaxed text-muted-foreground">
            Before processing we removed:{" "}
            {answer.redactions
              .map((r) => `${r.count} ${redactionLabels[r.type]}${r.count > 1 ? "s" : ""}`)
              .join(", ")}
            .
          </p>
        )}
      </aside>
    </div>
  );
}
