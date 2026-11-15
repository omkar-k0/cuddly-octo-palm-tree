import Link from "next/link";
import { site } from "@/config/site";

const nav = [
  { href: "/#domains", label: "Areas" },
  { href: "/#how", label: "How it works" },
  { href: "/#insights", label: "Insights" },
  { href: "/find-an-advocate", label: "Find an advocate" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-foreground/10 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-serif text-xl tracking-tight">{site.name}</span>
          <span className="hidden text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground sm:inline">
            Information, not advice
          </span>
        </Link>
        <nav aria-label="Main" className="flex items-center gap-5 text-sm">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="hidden text-muted-foreground transition-colors hover:text-foreground md:inline"
            >
              {n.label}
            </Link>
          ))}
          <Link
            href="/ask"
            className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground transition-opacity hover:opacity-90"
          >
            Ask a question
          </Link>
        </nav>
      </div>
    </header>
  );
}
