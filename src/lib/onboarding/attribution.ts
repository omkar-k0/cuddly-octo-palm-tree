/**
 * How a reviewing lawyer is shown next to "Verified". See @/config/reviewers.
 */
import { REVIEWER_ATTRIBUTION } from "@/config/reviewers";
import type { Country } from "@/lib/accounts/types";

type Mode = "anonymous" | "named";

/** "Adv. <name>" for India, "RA <name>" for Germany; null when reviewers are anonymous or the name is empty. */
export function reviewerLabel(
  { reviewerName, country }: { reviewerName: string | null | undefined; country: Country },
  mode: Mode = REVIEWER_ATTRIBUTION,
): string | null {
  if (mode !== "named") return null;
  const name = reviewerName?.trim();
  if (!name) return null;
  return country === "DE" ? `RA ${name}` : `Adv. ${name}`;
}

export type ReviewerLookup = (userId: string) => Promise<{ name: string; country: Country | null } | null>;

/** Production lookup. Imported lazily so anonymous mode never touches the accounts module. */
const accountsLookup: ReviewerLookup = async (userId) => {
  const { getUser } = await import("@/lib/accounts");
  return getUser(userId);
};

/**
 * The public label for the reviewer with this account id, or null. Skips the
 * lookup entirely in anonymous mode, and never throws: if accounts are
 * unavailable the answer simply shows plain "Verified".
 *
 * Owners and admins have no country; sources are Indian law for now, so they
 * are shown as "IN".
 */
export async function reviewerLabelForUser(
  userId: string | null | undefined,
  mode: Mode = REVIEWER_ATTRIBUTION,
  lookup: ReviewerLookup = accountsLookup,
): Promise<string | null> {
  if (mode !== "named" || !userId) return null;
  try {
    const user = await lookup(userId);
    if (!user) return null;
    return reviewerLabel({ reviewerName: user.name, country: user.country ?? "IN" }, mode);
  } catch {
    return null;
  }
}
