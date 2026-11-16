import { AnnouncementBar } from "@/components/announcement-bar";
import { DisclaimerGate } from "@/components/disclaimer-gate";
import { QueryProvider } from "@/components/query-context";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

/** Chrome for the public site. The admin area has its own layout. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-card focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <QueryProvider>
        <AnnouncementBar />
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <DisclaimerGate />
      </QueryProvider>
    </>
  );
}
