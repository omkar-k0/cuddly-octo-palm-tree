"use client";

export function SignOut() {
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/admin/logout", { method: "POST" });
        // Full navigation so no signed-in page stays in the client cache.
        window.location.assign("/admin/login");
      }}
      className="rounded-full border border-foreground/15 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-foreground/50 hover:text-foreground"
    >
      Sign out
    </button>
  );
}
