import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Mark } from "@/components/site-header";
import { TeamNav } from "@/components/team/team-nav";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: { default: "Verification", template: `%s · Verification · ${site.name}` },
  robots: { index: false, follow: false },
};

/** Lawyer verification dashboard. Access is checked in proxy.ts and on every page and API. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-foreground/10 bg-card/60">
        <div className="mx-auto flex min-h-14 max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-5 py-2 sm:px-8">
          <Link href="/admin" className="flex items-center gap-2.5">
            <Mark className="size-5 text-accent" />
            <span className="font-serif text-lg">{site.name}</span>
            <span className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">/ Verification</span>
          </Link>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            {/* Sources, Team and Account links for signed-in people; nothing on the login page. */}
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
