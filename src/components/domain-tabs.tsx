"use client";

import * as React from "react";
import { DomainAskLink } from "@/components/home-query";
import { domains } from "@/config/domains";
import { cn } from "@/lib/utils";

const TAB_MS = 7000;

/**
 * The four domains as a tabbed showcase: a large panel for the active area,
 * numbered tabs 01–04 below with a progress line. Auto-advances, pauses on
 * hover or focus, and does not auto-advance under reduced motion.
 */
export function DomainTabs() {
  const [active, setActive] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [reduced, setReduced] = React.useState(false);
  const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const set = () => setReduced(mq.matches);
    set();
    mq.addEventListener("change", set);
    return () => mq.removeEventListener("change", set);
  }, []);

  const d = domains[active];

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (active + (e.key === "ArrowRight" ? 1 : domains.length - 1)) % domains.length;
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div
        role="tabpanel"
        id={`domain-panel-${d.id}`}
        aria-labelledby={`domain-tab-${d.id}`}
        className="grid min-h-[26rem] gap-10 border-t border-foreground/10 py-14 lg:grid-cols-[1.3fr_1fr] lg:items-end"
      >
        <div key={d.id} className="rise">
          <p className="font-mono text-sm text-accent">( {d.number} )</p>
          <h3 className="mt-4 font-serif text-[clamp(3rem,8vw,7rem)] font-[340] leading-[0.92] tracking-[-0.03em]">
            {d.title.split(" & ").map((part, i, arr) => (
              <span key={part} className="block">
                {part}
                {i < arr.length - 1 && <span className="italic text-muted-foreground"> &amp;</span>}
              </span>
            ))}
          </h3>
        </div>
        <div key={`${d.id}-body`} className="rise rise-2 space-y-6">
          <p className="text-lg leading-relaxed text-muted-foreground">{d.blurb}</p>
          <ul className="divide-y divide-foreground/10 border-y border-foreground/10 text-sm">
            {d.topics.map((t) => (
              <li key={t} className="flex items-center justify-between py-2.5">
                {t}
                <span aria-hidden className="text-muted-foreground">→</span>
              </li>
            ))}
          </ul>
          <DomainAskLink id={d.id} title={d.title} />
        </div>
      </div>

      <div role="tablist" aria-label="Areas of law" className="grid grid-cols-2 gap-x-6 gap-y-2 md:grid-cols-4" onKeyDown={onKey}>
        {domains.map((t, i) => {
          const selected = i === active;
          return (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              id={`domain-tab-${t.id}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`domain-panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(i)}
              className={cn(
                "group relative pb-4 pt-3 text-left text-sm transition-colors",
                selected ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="mr-2 font-mono text-xs text-accent/80">{t.number}</span>
              {t.title}
              <span className="absolute inset-x-0 bottom-0 h-px bg-foreground/15" />
              {selected && (
                <span
                  key={`p-${active}`}
                  className="tab-progress absolute inset-x-0 bottom-0 h-px bg-accent"
                  data-paused={paused || reduced ? "true" : "false"}
                  style={{ ["--tab-ms" as string]: `${TAB_MS}ms` }}
                  onAnimationEnd={() => !reduced && setActive((a) => (a + 1) % domains.length)}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
