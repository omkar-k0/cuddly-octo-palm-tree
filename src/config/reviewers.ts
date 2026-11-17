/**
 * Whether the lawyers who verified a source are shown to the public.
 *
 * - "anonymous": answers say "Verified" and nothing more. (Current setting.)
 * - "named":     answers say "Verified by Adv. <name>" (India) or
 *                "Verified by RA <name>" (Germany), using the name on the
 *                reviewer's account and the reviewer who recorded the latest
 *                verification of that source.
 *
 * To switch: change the value below, then redeploy. Nothing else needs to
 * change. Names are looked up at answer time and only for sources that are
 * currently verified; if a name cannot be found, the answer falls back to
 * plain "Verified".
 *
 * CAUTION: naming reviewers publicly may count as advertising or
 * solicitation. In India the Bar Council of India Rules (Rule 36 and the
 * related rules on soliciting work and advertising) are strict, and in
 * Germany the BRAO and the BORA (professional rules) limit how lawyers
 * promote themselves. Check with a lawyer in each country, and get the
 * reviewers' consent, before switching to "named". (Rule references to be
 * confirmed by that lawyer.)
 */
export const REVIEWER_ATTRIBUTION: "anonymous" | "named" = "anonymous";
