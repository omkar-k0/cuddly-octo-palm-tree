"use client";

import * as React from "react";
import { AnswerView } from "@/components/answer-view";
import { QueryBox } from "@/components/query-box";
import { useQueryState, type FormContext } from "@/components/query-context";
import type { DomainId } from "@/config/domains";
import type { AnswerResponse } from "@/lib/pipeline/types";

type State =
  | { kind: "idle" }
  | { kind: "loading"; query: string }
  | { kind: "done"; query: string; answer: AnswerResponse }
  | { kind: "error"; query: string; message: string };

export function AskClient() {
  const { take, hint, setHint } = useQueryState();
  const [state, setState] = React.useState<State>({ kind: "idle" });
  const [draft, setDraft] = React.useState("");
  const [ctx, setCtx] = React.useState<FormContext>({});
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const controller = React.useRef<AbortController | null>(null);
  const resultRef = React.useRef<HTMLDivElement>(null);

  const ask = React.useCallback(async (query: string, h?: DomainId, context?: FormContext) => {
    controller.current?.abort();
    const ac = new AbortController();
    controller.current = ac;
    setDraft(query);
    if (context) {
      setCtx(context);
      if (context.event_date || context.state || context.local) setDetailsOpen(true);
    }
    setState({ kind: "loading", query });
    try {
      const res = await fetch("/api/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, hint: h, context: context && Object.values(context).some(Boolean) ? context : undefined }),
        signal: ac.signal,
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Something went wrong.");
      setState({ kind: "done", query, answer: data as AnswerResponse });
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setState({ kind: "error", query, message: (e as Error).message });
    }
  }, []);

  // Pick up a question handed over from the home page, once. This syncs with
  // an external hand-off store (QueryProvider's ref), so state is set here.
  React.useEffect(() => {
    const p = take();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (p) void ask(p.query, p.hint, p.context);
  }, [take, ask]);

  return (
    <div className="mx-auto max-w-7xl px-5 pb-24 pt-10 sm:px-8 sm:pt-14">
      <div ref={boxRef} className="mb-10 max-w-3xl scroll-mt-24">
        <h1 className="mb-6 font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
          What happened<span className="italic text-accent">?</span>
        </h1>
        <QueryBox
          compact
          autoFocus={state.kind === "idle"}
          value={draft}
          onValueChange={setDraft}
          hint={hint}
          onHintChange={setHint}
          context={ctx}
          onContextChange={setCtx}
          detailsOpen={detailsOpen}
          onDetailsOpenChange={setDetailsOpen}
          busy={state.kind === "loading"}
          onSubmit={(q, h, c) => void ask(q, h, c)}
        />
      </div>

      <div ref={resultRef} className="scroll-mt-20" aria-live="polite">
        {state.kind === "loading" && (
          <div className="max-w-3xl space-y-4" role="status">
            <p className="text-sm text-muted-foreground">
              Removing personal details, finding the right area of law, and reading the sources…
            </p>
            <div className="h-6 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-6 w-full animate-pulse rounded bg-muted" />
            <div className="h-6 w-5/6 animate-pulse rounded bg-muted" />
          </div>
        )}
        {state.kind === "error" && (
          <div className="max-w-3xl rounded-xl border border-danger/40 bg-danger-soft p-5 text-sm">
            <p>{state.message}</p>
            <button type="button" className="mt-3 font-medium underline underline-offset-4" onClick={() => void ask(state.query, hint, ctx)}>
              Try again
            </button>
          </div>
        )}
        {state.kind === "done" && (
          <AnswerView
            answer={state.answer}
            onFollowUp={(q) => setDraft(`${state.query}\n\n${q}`)}
            onAddContext={() => {
              setDetailsOpen(true);
              boxRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          />
        )}
      </div>
    </div>
  );
}
