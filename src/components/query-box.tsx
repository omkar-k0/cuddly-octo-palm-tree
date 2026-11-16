"use client";

import * as React from "react";
import { ArrowRight, CalendarDays, LockKeyhole, MapPin, X } from "lucide-react";
import { domains, getDomain, type DomainId } from "@/config/domains";
import { gating } from "@/config/gating";
import { states } from "@/config/jurisdictions";
import type { FormContext } from "@/components/query-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const EXAMPLE =
  "Describe what happened, in your own words. For example: I resigned in March 2025 after six years and my employer says I am not owed gratuity.";

export function QueryBox({
  onSubmit,
  value,
  onValueChange,
  hint,
  onHintChange,
  context,
  onContextChange,
  detailsOpen,
  onDetailsOpenChange,
  busy = false,
  compact = false,
  autoFocus = false,
}: {
  onSubmit: (query: string, hint?: DomainId, context?: FormContext) => void;
  /** Controlled text; leave unset for an uncontrolled box. */
  value?: string;
  onValueChange?: (v: string) => void;
  hint?: DomainId;
  onHintChange?: (h: DomainId | undefined) => void;
  context?: FormContext;
  onContextChange?: (c: FormContext) => void;
  detailsOpen?: boolean;
  onDetailsOpenChange?: (o: boolean) => void;
  busy?: boolean;
  compact?: boolean;
  autoFocus?: boolean;
}) {
  const [inner, setInner] = React.useState("");
  const [innerCtx, setInnerCtx] = React.useState<FormContext>({});
  const [innerOpen, setInnerOpen] = React.useState(false);
  const query = value ?? inner;
  const setQuery = onValueChange ?? setInner;
  const ctx = context ?? innerCtx;
  const setCtx = onContextChange ?? setInnerCtx;
  const open = detailsOpen ?? innerOpen;
  const setOpen = onDetailsOpenChange ?? setInnerOpen;

  const length = query.trim().length;
  const tooShort = length < gating.minQueryLength;
  const tooLong = length > gating.maxQueryLength;
  const selected = hint ? getDomain(hint) : undefined;
  const ctxCount = [ctx.event_date, ctx.state, ctx.local].filter(Boolean).length;

  const send = () => {
    if (busy || tooShort || tooLong) return;
    const clean: FormContext = {
      event_date: ctx.event_date || undefined,
      state: ctx.state || undefined,
      local: ctx.local?.trim() || undefined,
    };
    onSubmit(query.trim(), hint, clean);
  };

  return (
    <form
      className="group rounded-2xl border border-foreground/15 bg-card/80 backdrop-blur transition-colors focus-within:border-foreground/45"
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      <label htmlFor="query" className="sr-only">
        Describe your legal problem
      </label>
      <Textarea
        id="query"
        name="query"
        autoFocus={autoFocus}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            send();
          }
        }}
        placeholder={EXAMPLE}
        rows={compact ? 3 : 4}
        maxLength={gating.maxQueryLength + 200}
        className={cn("px-5 pt-5 leading-relaxed", compact ? "text-[0.95rem]" : "text-[1.05rem]")}
        autoComplete="off"
        spellCheck
      />

      <div className="flex flex-wrap items-center gap-2 px-5 pb-1 pt-2">
        <span className="font-mono text-[0.68rem] uppercase tracking-[0.1em] text-muted-foreground">Area</span>
        {selected ? (
          <button
            type="button"
            onClick={() => onHintChange?.(undefined)}
            className="inline-flex items-center gap-1 rounded-full border border-foreground/30 px-2.5 py-0.5 text-xs"
          >
            {selected.number} {selected.title} <X className="size-3" aria-label="clear area" />
          </button>
        ) : (
          domains.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => onHintChange?.(d.id)}
              className="rounded-full border border-foreground/10 px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
            >
              {d.title}
            </button>
          ))
        )}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="query-details"
          className={cn(
            "ml-auto inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs transition-colors",
            open || ctxCount ? "border-accent/50 text-accent" : "border-foreground/10 text-muted-foreground hover:text-foreground",
          )}
        >
          <MapPin className="size-3" aria-hidden /> When &amp; where{ctxCount ? ` · ${ctxCount}` : ""}
        </button>
      </div>

      {open && (
        <div id="query-details" className="grid gap-3 px-5 pb-2 pt-3 sm:grid-cols-3">
          <label className="space-y-1">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarDays className="size-3" aria-hidden /> When did it happen?
            </span>
            <input
              type="month"
              value={ctx.event_date ?? ""}
              max={new Date().toISOString().slice(0, 7)}
              onChange={(e) => setCtx({ ...ctx, event_date: e.target.value })}
              className="h-9 w-full rounded-md border border-foreground/15 bg-transparent px-2 text-sm"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">State / UT</span>
            <select
              value={ctx.state ?? ""}
              onChange={(e) => setCtx({ ...ctx, state: e.target.value })}
              className="h-9 w-full rounded-md border border-foreground/15 bg-card px-2 text-sm"
            >
              <option value="">Not specified</option>
              {states.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">City, district or village</span>
            <input
              type="text"
              value={ctx.local ?? ""}
              maxLength={80}
              placeholder="e.g. Pune"
              onChange={(e) => setCtx({ ...ctx, local: e.target.value })}
              className="h-9 w-full rounded-md border border-foreground/15 bg-transparent px-2 text-sm"
            />
          </label>
          <p className="text-xs text-muted-foreground sm:col-span-3">
            Optional. The date decides which law applies (several labour laws changed on 21 November 2025). The
            place decides whether state or local rules apply.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-foreground/10 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 text-xs leading-snug text-muted-foreground">
          <LockKeyhole className="mt-px size-3.5 shrink-0" aria-hidden />
          <span>Names, phone and ID numbers are removed before processing. Your question is not stored.</span>
        </p>
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <span className={cn("font-mono text-xs tabular-nums", tooLong ? "text-accent" : "text-muted-foreground/70")}>
            {length}/{gating.maxQueryLength}
          </span>
          <Button type="submit" variant="accent" size={compact ? "default" : "lg"} className="rounded-full" disabled={busy || tooShort || tooLong}>
            {busy ? "Preparing…" : "Get a cited explanation"}
            <ArrowRight aria-hidden />
          </Button>
        </div>
      </div>
    </form>
  );
}
