"use client";

import * as React from "react";
import { ArrowRight, LockKeyhole, X } from "lucide-react";
import { domains, getDomain, type DomainId } from "@/config/domains";
import { gating } from "@/config/gating";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const EXAMPLE =
  "Describe what happened, in your own words. For example: I resigned after six years and my employer says I am not owed gratuity.";

export function QueryBox({
  onSubmit,
  value,
  onValueChange,
  hint,
  onHintChange,
  busy = false,
  compact = false,
  autoFocus = false,
}: {
  onSubmit: (query: string, hint?: DomainId) => void;
  /** Controlled text; leave unset for an uncontrolled box. */
  value?: string;
  onValueChange?: (v: string) => void;
  hint?: DomainId;
  onHintChange?: (h: DomainId | undefined) => void;
  busy?: boolean;
  compact?: boolean;
  autoFocus?: boolean;
}) {
  const [inner, setInner] = React.useState("");
  const query = value ?? inner;
  const setQuery = onValueChange ?? setInner;

  const length = query.trim().length;
  const tooShort = length < gating.minQueryLength;
  const tooLong = length > gating.maxQueryLength;
  const selected = hint ? getDomain(hint) : undefined;

  const send = () => {
    if (busy || tooShort || tooLong) return;
    onSubmit(query.trim(), hint);
  };

  return (
    <form
      className="group rounded-lg border border-foreground/15 bg-card shadow-[0_1px_0_rgba(0,0,0,0.03)] transition-colors focus-within:border-foreground/50"
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
        rows={compact ? 3 : 5}
        maxLength={gating.maxQueryLength + 200}
        className={cn("px-5 pt-5 leading-relaxed", compact ? "text-[0.95rem]" : "text-[1.05rem]")}
        autoComplete="off"
        spellCheck
      />

      <div className="flex flex-wrap items-center gap-2 px-5 pb-1 pt-2">
        <span className="text-xs text-muted-foreground">Area (optional):</span>
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
      </div>

      <div className="flex flex-col gap-3 border-t border-foreground/10 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 text-xs leading-snug text-muted-foreground">
          <LockKeyhole className="mt-px size-3.5 shrink-0" aria-hidden />
          <span>
            Names, phone and ID numbers are removed before processing. Your question is not stored.
          </span>
        </p>
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <span className={cn("text-xs tabular-nums", tooLong ? "text-accent" : "text-muted-foreground/70")}>
            {length}/{gating.maxQueryLength}
          </span>
          <Button type="submit" variant="accent" size={compact ? "default" : "lg"} disabled={busy || tooShort || tooLong}>
            {busy ? "Preparing…" : "Get a cited explanation"}
            <ArrowRight aria-hidden />
          </Button>
        </div>
      </div>
    </form>
  );
}
