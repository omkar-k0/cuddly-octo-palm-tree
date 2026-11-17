"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { UserStatus } from "@/lib/accounts/types";
import { SetupLinkBox } from "./setup-link-box";

const outline =
  "h-10 rounded-full border border-foreground/20 px-5 text-sm transition-colors hover:border-foreground/60 disabled:opacity-50";

type Message = { kind: "ok" | "error"; text: string };

/**
 * Actions on one member. The page only renders this when the signed-in
 * person may manage the member; the API checks again.
 */
export function MemberActions({ id, name, status }: { id: string; name: string; status: UserStatus }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<Message | null>(null);
  const [link, setLink] = React.useState<string | null>(null);

  async function call(action: string, path: string, body?: unknown): Promise<Record<string, unknown> | null> {
    setBusy(action);
    setMessage(null);
    try {
      const res = await fetch(`/api/team/users/${id}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage({ kind: "error", text: data?.error ?? "That did not work. Try again." });
        return null;
      }
      return data ?? {};
    } catch {
      setMessage({ kind: "error", text: "Could not reach the server. Check your connection and try again." });
      return null;
    } finally {
      setBusy(null);
    }
  }

  const suspended = status === "suspended";

  return (
    <section aria-labelledby="member-actions" className="rounded-xl border border-foreground/10 bg-card/40 p-5">
      <h2 id="member-actions" className="font-serif text-2xl">
        Actions
      </h2>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy !== null}
          className={suspended ? "h-10 rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50" : `${outline} border-danger/40 text-danger hover:border-danger`}
          onClick={async () => {
            if (!suspended && !window.confirm(`Suspend ${name}? They are signed out at once and cannot sign in until reactivated.`)) return;
            const next = suspended ? "active" : "suspended";
            if (await call("status", "status", { status: next })) {
              setMessage({ kind: "ok", text: suspended ? `${name} is active again.` : `${name} is suspended and signed out everywhere.` });
              router.refresh();
            }
          }}
        >
          {busy === "status" ? "Working…" : suspended ? "Reactivate" : "Suspend"}
        </button>

        <button
          type="button"
          disabled={busy !== null}
          className={outline}
          onClick={async () => {
            if (!window.confirm(`Create a new setup link for ${name}? Any earlier link stops working.`)) return;
            const data = await call("link", "setup-link");
            if (data && typeof data.setupUrl === "string") {
              setLink(data.setupUrl);
              setMessage({ kind: "ok", text: "New setup link created." });
              router.refresh();
            }
          }}
        >
          {busy === "link" ? "Working…" : "New setup link"}
        </button>

        <button
          type="button"
          disabled={busy !== null}
          className={outline}
          onClick={async () => {
            if (!window.confirm(`Sign ${name} out of every device?`)) return;
            if (await call("revoke", "sessions/revoke")) {
              setMessage({ kind: "ok", text: `${name} is signed out everywhere.` });
              router.refresh();
            }
          }}
        >
          {busy === "revoke" ? "Working…" : "Sign out everywhere"}
        </button>
      </div>

      <div aria-live="polite" className="mt-4 space-y-3">
        {message && (
          <p role={message.kind === "error" ? "alert" : "status"} className={message.kind === "ok" ? "text-sm text-verified" : "rounded-lg border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger"}>
            {message.text}
          </p>
        )}
        {link && <SetupLinkBox url={link} />}
      </div>
    </section>
  );
}
