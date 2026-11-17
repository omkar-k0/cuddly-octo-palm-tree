"use client";

import * as React from "react";

/**
 * Shows a one-time setup link with a copy button. The link exists only in
 * this component's state: it is not stored anywhere and is gone on reload.
 */
export function SetupLinkBox({ url, heading = "Setup link" }: { url: string; heading?: string }) {
  const [copied, setCopied] = React.useState<"yes" | "no" | null>(null);
  const input = React.useRef<HTMLInputElement>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied("yes");
    } catch {
      // Clipboard API unavailable (insecure context, permissions): select the text so Ctrl+C works.
      input.current?.select();
      setCopied("no");
    }
  };

  return (
    <section aria-label={heading} className="rounded-xl border border-accent/40 bg-accent-soft p-4">
      <label htmlFor="setup-link-url" className="font-mono text-[0.68rem] uppercase tracking-[0.12em] text-accent">
        {heading}
      </label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          id="setup-link-url"
          ref={input}
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="h-10 min-w-0 flex-1 rounded-lg border border-foreground/15 bg-background px-3 font-mono text-xs focus:border-foreground/50 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => void copy()}
          className="h-10 shrink-0 rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
        >
          Copy link
        </button>
      </div>
      <p role="status" aria-live="polite" className="mt-2 min-h-5 text-xs text-verified">
        {copied === "yes" && "Copied to the clipboard."}
        {copied === "no" && <span className="text-danger">Could not copy automatically. The link is selected: press Ctrl+C or Cmd+C.</span>}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">Shown once. Send it privately; it expires in 72 hours.</p>
    </section>
  );
}
