"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "verified", label: "Verified", hint: "The text matches the official source and is correctly labelled." },
  { value: "needs_changes", label: "Needs changes", hint: "Usable but something is off: wrong heading, dates, jurisdiction or missing text." },
  { value: "rejected", label: "Rejected", hint: "Wrong, repealed or misleading. It will no longer be used in answers." },
] as const;

export function ReviewForm({
  sourceId,
  contentHash,
  canSave,
  nextHref,
}: {
  sourceId: string;
  contentHash: string;
  canSave: boolean;
  nextHref: string;
}) {
  const router = useRouter();
  const [status, setStatus] = React.useState<(typeof OPTIONS)[number]["value"] | null>(null);
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const noteRequired = status === "needs_changes" || status === "rejected";

  const submit = async (goNext: boolean) => {
    if (!status) return;
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/admin/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_id: sourceId, status, note, content_hash: contentHash }),
    });
    setBusy(false);
    if (!res.ok) {
      setMessage({ kind: "error", text: (await res.json().catch(() => null))?.error ?? "Could not save." });
      return;
    }
    setNote("");
    setStatus(null);
    if (goNext) router.push(nextHref);
    else {
      setMessage({ kind: "ok", text: "Saved." });
      router.refresh();
    }
  };

  return (
    <form
      className="mt-4 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit(true);
      }}
    >
      <fieldset className="space-y-2" disabled={!canSave || busy}>
        <legend className="sr-only">Decision</legend>
        {OPTIONS.map((o) => (
          <label
            key={o.value}
            className={cn(
              "flex cursor-pointer gap-3 rounded-lg border p-3 text-sm transition-colors",
              status === o.value ? "border-accent bg-accent-soft" : "border-foreground/15 hover:border-foreground/40",
            )}
          >
            <input
              type="radio"
              name="status"
              value={o.value}
              checked={status === o.value}
              onChange={() => setStatus(o.value)}
              className="mt-1 accent-[var(--accent)]"
            />
            <span>
              <span className="font-medium">{o.label}</span>
              <span className="block text-xs text-muted-foreground">{o.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <label className="block space-y-1.5">
        <span className="text-sm">
          Note {noteRequired ? <span className="text-danger">(required)</span> : <span className="text-muted-foreground">(optional)</span>}
        </span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={2000}
          disabled={!canSave || busy}
          placeholder={noteRequired ? "What is wrong, and what should change?" : "Anything worth recording"}
          className="w-full rounded-lg border border-foreground/15 bg-background p-3 text-sm focus:border-foreground/50 focus:outline-none"
        />
      </label>
      {message && (
        <p role="status" className={cn("text-sm", message.kind === "ok" ? "text-verified" : "text-danger")}>
          {message.text}
        </p>
      )}
      {!canSave && <p className="text-xs text-danger">Saving is unavailable: no verification database is configured.</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={!canSave || busy || !status || (noteRequired && !note.trim())}
          className="h-10 rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save and next"}
        </button>
        <button
          type="button"
          onClick={() => void submit(false)}
          disabled={!canSave || busy || !status || (noteRequired && !note.trim())}
          className="h-10 rounded-full border border-foreground/20 px-5 text-sm transition-colors hover:border-foreground/60 disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </form>
  );
}
