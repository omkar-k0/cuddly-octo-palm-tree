"use client";

import * as React from "react";
import Link from "next/link";
import { site } from "@/config/site";

/**
 * First-visit acknowledgement, in the pattern Indian law-firm websites use
 * (Bar Council of India rules on solicitation), adapted for an information
 * service. The only thing remembered is that this browser clicked "I
 * understand", in localStorage. No cookie, nothing sent to a server.
 */
const KEY = "ack-disclaimer-v1";

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}
function read(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function DisclaimerGate() {
  const stored = React.useSyncExternalStore(subscribe, read, () => true);
  const [dismissed, setDismissed] = React.useState(false);
  const button = React.useRef<HTMLButtonElement>(null);
  const open = !stored && !dismissed;

  React.useEffect(() => {
    if (open) button.current?.focus();
  }, [open]);

  if (!open) return null;

  const accept = () => {
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {
      /* private mode: show again next visit */
    }
    setDismissed(true);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gate-title"
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-foreground/15 bg-card p-6 text-card-foreground shadow-2xl sm:p-8"
      >
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-accent">Before you continue</p>
        <h2 id="gate-title" className="mt-3 font-serif text-3xl leading-tight">
          Information, not advice
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          The Bar Council of India does not permit advocates to advertise or solicit work. {site.name} is not a law
          firm and does not advertise or recommend any advocate. By continuing, you confirm that:
        </p>
        <ul className="mt-4 space-y-2 text-sm leading-relaxed">
          {[
            "You are here of your own accord, looking for general information about Indian law.",
            "Answers are generated automatically from statutes and judgments, and are not legal advice.",
            "Using this service does not create an advocate–client relationship with anyone.",
            "You will speak to an advocate before acting on anything you read here.",
          ].map((t) => (
            <li key={t} className="flex gap-3">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Read the full <Link href="/disclaimer" className="underline underline-offset-4">disclaimer</Link> and{" "}
            <Link href="/privacy" className="underline underline-offset-4">privacy notice</Link>.
          </p>
          <button
            ref={button}
            type="button"
            onClick={accept}
            className="h-11 shrink-0 rounded-full bg-accent px-6 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
          >
            I understand
          </button>
        </div>
      </div>
    </div>
  );
}
