"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface AccordionItem {
  title: string;
  body: string;
}

/** Numbered "( 1 )" accordion. One item open at a time. */
export function HowAccordion({ items }: { items: AccordionItem[] }) {
  const [open, setOpen] = React.useState(0);
  return (
    <ol className="border-t border-foreground/10">
      {items.map((it, i) => {
        const isOpen = i === open;
        return (
          <li key={it.title} className="border-b border-foreground/10">
            <h3>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`how-${i}`}
                id={`how-btn-${i}`}
                onClick={() => setOpen(i)}
                className="flex w-full items-baseline gap-5 py-5 text-left"
              >
                <span className={cn("font-mono text-sm transition-colors", isOpen ? "text-accent" : "text-muted-foreground")}>
                  ( {i + 1} )
                </span>
                <span className={cn("text-xl transition-colors sm:text-2xl", isOpen ? "text-foreground" : "text-muted-foreground")}>
                  {it.title}
                </span>
              </button>
            </h3>
            <div
              id={`how-${i}`}
              role="region"
              aria-labelledby={`how-btn-${i}`}
              hidden={!isOpen}
              className="pb-6 pl-[3.6rem] pr-4"
            >
              <p className="max-w-xl leading-relaxed text-muted-foreground">{it.body}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
