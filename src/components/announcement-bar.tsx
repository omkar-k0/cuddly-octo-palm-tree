"use client";

import * as React from "react";
import Link from "next/link";
import { X } from "lucide-react";

/** Thin accent strip above the header. Dismissal lasts for this page view only. */
export function AnnouncementBar() {
  const [open, setOpen] = React.useState(true);
  if (!open) return null;
  return (
    <div className="relative bg-accent text-accent-foreground">
      <p className="mx-auto max-w-7xl px-10 py-1.5 text-center text-[0.78rem]">
        V0 preview: statutes are sourced from India Code and are being checked by lawyers.{" "}
        <Link href="/disclaimer" className="font-medium underline underline-offset-2">
          How we cite
        </Link>
      </p>
      <button
        type="button"
        onClick={() => setOpen(false)}
        aria-label="Dismiss announcement"
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-black/10"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
