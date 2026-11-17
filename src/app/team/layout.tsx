import type { Metadata } from "next";
import { TeamChrome } from "@/components/team/chrome";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: { default: "Team", template: `%s · Team · ${site.name}` },
  robots: { index: false, follow: false },
};

/** Team dashboard. Access is checked in proxy.ts and on every page and API. */
export default function TeamLayout({ children }: { children: React.ReactNode }) {
  return <TeamChrome label="Team">{children}</TeamChrome>;
}
