import type { Metadata } from "next";
import { TeamChrome } from "@/components/team/chrome";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: { default: "Account", template: `%s · ${site.name}` },
  robots: { index: false, follow: false },
};

/** Account pages. /account/setup is open (no session yet); the rest check the session themselves. */
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <TeamChrome label="Account">{children}</TeamChrome>;
}
