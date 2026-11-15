import Link from "next/link";
import { site } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-band-border bg-band text-band-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-3">
          <p className="font-serif text-2xl">{site.name}</p>
          <p className="max-w-md text-sm leading-relaxed text-band-muted">{site.disclaimerShort}</p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="text-[0.7rem] uppercase tracking-[0.14em] text-band-muted">Product</p>
          <ul className="space-y-1.5">
            <li><Link href="/ask" className="hover:underline">Ask a question</Link></li>
            <li><Link href="/#domains" className="hover:underline">Areas we cover</Link></li>
            <li><Link href="/find-an-advocate" className="hover:underline">Find an advocate</Link></li>
          </ul>
        </div>
        <div className="space-y-2 text-sm">
          <p className="text-[0.7rem] uppercase tracking-[0.14em] text-band-muted">Legal</p>
          <ul className="space-y-1.5">
            <li><Link href="/disclaimer" className="hover:underline">Disclaimer</Link></li>
            <li><Link href="/privacy" className="hover:underline">Privacy notice</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-band-border">
        <p className="mx-auto max-w-7xl px-5 py-5 text-xs text-band-muted sm:px-8">
          V0 prototype. Sources are being verified; do not rely on any answer without speaking to an advocate.
        </p>
      </div>
    </footer>
  );
}
