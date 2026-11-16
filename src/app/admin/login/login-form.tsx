"use client";

import * as React from "react";

export function LoginForm() {
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  return (
    <form
      className="mt-8 space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        setBusy(true);
        setError(null);
        const res = await fetch("/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
        });
        setBusy(false);
        if (res.ok) {
          // Full navigation so the server renders with the new session cookie.
          window.location.assign("/admin");
        } else {
          setError((await res.json().catch(() => null))?.error ?? "Could not sign in.");
        }
      }}
    >
      <label className="block space-y-1.5">
        <span className="text-sm">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          className="h-11 w-full rounded-lg border border-foreground/15 bg-card px-3 text-sm focus:border-foreground/50 focus:outline-none"
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm">Password</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="h-11 w-full rounded-lg border border-foreground/15 bg-card px-3 text-sm focus:border-foreground/50 focus:outline-none"
        />
      </label>
      {error && (
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="h-11 w-full rounded-full bg-accent text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
