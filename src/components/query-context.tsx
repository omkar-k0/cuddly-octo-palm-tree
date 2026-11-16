"use client";

import * as React from "react";
import type { DomainId } from "@/config/domains";

/**
 * Hands a question from the home page to /ask in memory only. The question
 * never goes into the URL, browser storage or history; a refresh drops it.
 */
export interface FormContext {
  event_date?: string;
  state?: string;
  local?: string;
}

export interface Pending {
  query: string;
  hint?: DomainId;
  context?: FormContext;
}

interface QueryState {
  hint: DomainId | undefined;
  setHint: (h: DomainId | undefined) => void;
  /** Store a question for /ask to pick up. */
  submit: (p: Pending) => void;
  /** Take the stored question (once). */
  take: () => Pending | null;
}

const Ctx = React.createContext<QueryState | null>(null);

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const pendingRef = React.useRef<Pending | null>(null);
  const [hint, setHint] = React.useState<DomainId | undefined>(undefined);

  const value = React.useMemo<QueryState>(
    () => ({
      hint,
      setHint,
      submit: (p) => {
        pendingRef.current = p;
      },
      take: () => {
        const p = pendingRef.current;
        pendingRef.current = null;
        return p;
      },
    }),
    [hint],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useQueryState() {
  const v = React.useContext(Ctx);
  if (!v) throw new Error("useQueryState outside QueryProvider");
  return v;
}
