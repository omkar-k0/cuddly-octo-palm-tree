import Link from "next/link";
import { Mark } from "@/components/site-header";
import { site } from "@/config/site";

const cols = [
  {
    title: "Product",
    links: [
      { href: "/ask", label: "Ask a question" },
      { href: "/#domains", label: "Areas we cover" },
      { href: "/find-an-advocate", label: "Find an advocate" },
      { href: "/lawyers/join", label: "For lawyers: become a reviewer" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/disclaimer", label: "Disclaimer" },
      { href: "/privacy", label: "Privacy notice" },
      { href: "/terms", label: "Terms of use" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-band-border bg-band text-band-foreground">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 md:grid-cols-[1.6fr_1fr_1fr]">
        <div className="space-y-4">
          <p className="flex items-center gap-2.5 font-serif text-2xl">
            <Mark className="size-7 text-accent" /> {site.name}
          </p>
          <p className="max-w-md text-sm leading-relaxed text-band-muted">{site.disclaimerShort}</p>
        </div>
        {cols.map((c) => (
          <div key={c.title} className="space-y-3 text-sm">
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-band-muted">{c.title}</p>
            <ul className="space-y-2">
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="transition-colors hover:text-accent">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-band-border">
        <p className="mx-auto max-w-7xl px-5 py-5 font-mono text-[0.7rem] uppercase tracking-[0.1em] text-band-muted sm:px-8">
          V0 prototype · Statutes from India Code, pending lawyer verification
        </p>
      </div>
    </footer>
  );
}
