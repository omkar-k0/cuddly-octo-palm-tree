import Link from "next/link";
import { Suspense } from "react";
import { Mark } from "@/components/site-header";
import { site } from "@/config/site";
import { TeamNav } from "./team-nav";

/** Header and main area shared by the team and account pages. */
export function TeamChrome({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-foreground/10 bg-card/60">
        <div className="mx-auto flex min-h-14 max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-5 py-2 sm:px-8">
          <Link href="/admin" className="flex items-center gap-2.5">
            <Mark className="size-5 text-accent" />
            <span className="font-serif text-lg">{site.name}</span>
            <span className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">/ {label}</span>
          </Link>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <Suspense fallback={null}>
              <TeamNav />
            </Suspense>
            <Link href="/" className="text-xs text-muted-foreground hover:text-foreground">
              View site ↗
            </Link>
          </div>
        </div>
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
    </div>
  );
}
