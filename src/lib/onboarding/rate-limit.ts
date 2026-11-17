/**
 * In-memory sliding-window rate limit for the public application form.
 *
 * Best effort: the counters live in one server instance, so on serverless
 * hosting each instance counts separately and a cold start resets them. It
 * slows down casual abuse; it is not a security boundary.
 */
export const APPLY_LIMIT = 5;
export const APPLY_WINDOW_MS = 60 * 60 * 1000;

const hits = new Map<string, number[]>();

/** Records one attempt for `key`. Returns the seconds to wait when the limit is exceeded, otherwise null. */
export function hitRateLimit(key: string, now = Date.now(), limit = APPLY_LIMIT, windowMs = APPLY_WINDOW_MS): number | null {
  if (hits.size > 5000) {
    for (const [k, times] of hits) if (!times.some((t) => now - t < windowMs)) hits.delete(k);
  }
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000));
  }
  recent.push(now);
  hits.set(key, recent);
  return null;
}

/** Tests only. */
export function resetRateLimit() {
  hits.clear();
}
