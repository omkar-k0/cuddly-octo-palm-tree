"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { site } from "@/config/site";

const nav = [
  { href: "/#domains", label: "Areas" },
  { href: "/#how", label: "How it works" },
  { href: "/#insights", label: "Insights" },
  { href: "/find-an-advocate", label: "Find an advocate" },
];

export function Mark({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect x="1" y="1" width="22" height="22" rx="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <text x="12" y="17" textAnchor="middle" fontFamily="Georgia, serif" fontSize="14" fill="currentColor">
        §
      </text>
    </svg>
  );
}

/** Floating pill header. */
export function SiteHeader() {
  const [open, setOpen] = React.useState(false);
  return (
    <header className="sticky top-3 z-40 px-3 sm:px-5">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between rounded-full border border-foreground/10 bg-card/80 pl-5 pr-2 backdrop-blur-md supports-[backdrop-filter]:bg-card/60">
        <Link href="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <Mark className="size-6 text-accent" />
          <span className="font-serif text-[1.15rem] tracking-tight">{site.name}</span>
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-7 text-sm md:flex">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="text-muted-foreground transition-colors hover:text-foreground">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1">
          <Link
            href="/ask"
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
          >
            Ask a question
          </Link>
          <button
            type="button"
            className="rounded-full p-2.5 text-muted-foreground hover:text-foreground md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {open && (
        <nav aria-label="Mobile" className="mx-auto mt-2 max-w-7xl rounded-2xl border border-foreground/10 bg-card p-2 md:hidden">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="block rounded-xl px-4 py-3 text-sm hover:bg-muted">
              {n.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
