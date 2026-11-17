import { getCurrentUser } from "@/lib/accounts/session";
import { NavLinks, type NavItem } from "./nav-links";

/** Links lawyers do not see (the pages would be not-found for them). */
const TEAM_ONLY = new Set(["/team", "/team/applications", "/team/audit"]);

const ITEMS: NavItem[] = [
  { href: "/admin", label: "Sources", match: "/admin" },
  { href: "/team", label: "Team", match: "/team", except: ["/team/applications", "/team/audit"] },
  { href: "/team/applications", label: "Applications", match: "/team/applications" },
  { href: "/team/audit", label: "Audit log", match: "/team/audit" },
  { href: "/account", label: "Account", match: "/account" },
];

/**
 * Dashboard navigation for signed-in people. Lawyers do not see the team
 * links. Signed-out visitors (login, setup) see nothing.
 * Reads the session cookie: render inside <Suspense>.
 */
export async function TeamNav() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return null;
  return <NavLinks items={ITEMS.filter((i) => user.role !== "lawyer" || !TEAM_ONLY.has(i.href))} />;
}
