import type { Metadata } from "next";
import Link from "next/link";
import { Mark } from "@/components/site-header";
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
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/admin" className="flex items-center gap-2.5">
            <Mark className="size-5 text-accent" />
            <span className="font-serif text-lg">{site.name}</span>
            <span className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">/ Verification</span>
          </Link>
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground">
            View site ↗
          </Link>
        </div>
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
    </div>
  );
}
