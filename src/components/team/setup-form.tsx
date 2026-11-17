"use client";

import * as React from "react";
import { MIN_PASSWORD_LENGTH, PasswordStrength } from "./password-strength";

const field =
  "h-11 w-full rounded-lg border border-foreground/15 bg-card px-3 text-sm focus:border-foreground/50 focus:outline-none";

const INVALID_LINK = "This link is invalid or has expired. Ask your team for a new one.";

/** Choose a password from a one-time setup link, then continue to the dashboard. */
export function SetupForm({ token }: { token: string }) {
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [show, setShow] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const tooShort = password.length < MIN_PASSWORD_LENGTH;
  const mismatch = confirm.length > 0 && confirm !== password;
  const type = show ? "text" : "password";

  return (
    <form
      className="mt-8 space-y-4"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        if (tooShort) return setError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
        if (password !== confirm) return setError("The two passwords do not match.");
        setBusy(true);
        setError(null);
        try {
          const res = await fetch("/api/account/setup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, password }),
          });
          if (res.ok) {
            // Full navigation so the server renders with the new session cookie.
            window.location.assign("/admin");
            return;
          }
          const body = await res.json().catch(() => null);
          setError(
            body?.code === "invalid_token" || body?.code === "expired_token"
              ? INVALID_LINK
              : body?.code === "weak_password"
                ? `That password is too weak. Use at least ${MIN_PASSWORD_LENGTH} characters, ideally a passphrase of several words.`
                : (body?.error ?? "Could not set the password. Try again."),
          );
        } catch {
          setError("Could not reach the server. Check your connection and try again.");
        }
        setBusy(false);
      }}
    >
      <label className="block space-y-1.5">
        <span className="text-sm">New password</span>
        <input
          type={type}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
          aria-describedby="password-hints"
          className={field}
        />
      </label>
      <PasswordStrength id="password-hints" password={password} />
      <label className="block space-y-1.5">
        <span className="text-sm">Confirm password</span>
        <input
          type={type}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          autoComplete="new-password"
          aria-invalid={mismatch || undefined}
          aria-describedby="confirm-status"
          className={field}
        />
      </label>
      <p id="confirm-status" aria-live="polite" className="min-h-4 text-xs text-danger">
        {mismatch ? "The two passwords do not match." : ""}
      </p>
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} className="accent-[var(--accent)]" />
        Show passwords
      </label>
      <div aria-live="assertive">
        {error && (
          <p role="alert" className="rounded-lg border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={busy || tooShort || mismatch || confirm.length === 0}
        className="h-11 w-full rounded-full bg-accent text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {busy ? "Saving…" : "Set password and sign in"}
      </button>
    </form>
  );
}
