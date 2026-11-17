"use client";

import * as React from "react";
import { MIN_PASSWORD_LENGTH, PasswordStrength } from "./password-strength";

const field =
  "h-11 w-full rounded-lg border border-foreground/15 bg-card px-3 text-sm focus:border-foreground/50 focus:outline-none";

export function ChangePasswordForm({ personal }: { personal: string[] }) {
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const mismatch = confirm.length > 0 && confirm !== next;

  return (
    <form
      className="mt-5 max-w-md space-y-4"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        if (next.length < MIN_PASSWORD_LENGTH) return setMessage({ kind: "error", text: `Use at least ${MIN_PASSWORD_LENGTH} characters.` });
        if (next !== confirm) return setMessage({ kind: "error", text: "The two new passwords do not match." });
        setBusy(true);
        setMessage(null);
        try {
          const res = await fetch("/api/account/password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ current, next }),
          });
          const body = await res.json().catch(() => null);
          if (res.ok) {
            setCurrent("");
            setNext("");
            setConfirm("");
            setMessage({ kind: "ok", text: "Password changed. Your other devices have been signed out." });
          } else {
            setMessage({
              kind: "error",
              text:
                body?.code === "invalid_current"
                  ? "Your current password is not correct."
                  : body?.code === "weak_password"
                    ? `That password is too weak. Use at least ${MIN_PASSWORD_LENGTH} characters.`
                    : (body?.error ?? "Could not change the password."),
            });
          }
        } catch {
          setMessage({ kind: "error", text: "Could not reach the server. Check your connection and try again." });
        }
        setBusy(false);
      }}
    >
      <label className="block space-y-1.5">
        <span className="text-sm">Current password</span>
        <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" className={field} />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm">New password</span>
        <input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          required
          autoComplete="new-password"
          aria-describedby="new-password-hints"
          className={field}
        />
      </label>
      <PasswordStrength id="new-password-hints" password={next} personal={personal} />
      <label className="block space-y-1.5">
        <span className="text-sm">Confirm new password</span>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          autoComplete="new-password"
          aria-invalid={mismatch || undefined}
          aria-describedby="new-confirm-status"
          className={field}
        />
      </label>
      <p id="new-confirm-status" aria-live="polite" className="min-h-4 text-xs text-danger">
        {mismatch ? "The two new passwords do not match." : ""}
      </p>
      <div aria-live="polite">
        {message && (
          <p
            role={message.kind === "error" ? "alert" : "status"}
            className={message.kind === "ok" ? "text-sm text-verified" : "rounded-lg border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger"}
          >
            {message.text}
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={busy || !current || next.length < MIN_PASSWORD_LENGTH || mismatch || !confirm}
        className="h-11 rounded-full bg-accent px-6 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {busy ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}

export function SignOutEverywhere() {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  return (
    <div className="mt-4">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          if (!window.confirm("Sign out of every device, including this one?")) return;
          setBusy(true);
          setError(null);
          try {
            const res = await fetch("/api/account/sessions/revoke", { method: "POST" });
            if (res.ok) {
              // Full navigation so no signed-in page stays in the client cache.
              window.location.assign("/admin/login");
              return;
            }
            setError((await res.json().catch(() => null))?.error ?? "Could not sign you out. Try again.");
          } catch {
            setError("Could not reach the server. Check your connection and try again.");
          }
          setBusy(false);
        }}
        className="h-10 rounded-full border border-danger/40 px-5 text-sm text-danger transition-colors hover:border-danger disabled:opacity-50"
      >
        {busy ? "Signing out…" : "Sign out of all devices"}
      </button>
      <div aria-live="polite">
        {error && (
          <p role="alert" className="mt-3 rounded-lg border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
