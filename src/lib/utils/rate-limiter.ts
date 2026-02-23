/**
 * Simple in-memory rate limiter for API endpoints.
 * Uses a sliding window approach with automatic cleanup of expired entries.
 *
 * NOTE: This is per-process and resets on deploy/restart. For production-grade
 * rate limiting across multiple serverless instances, consider Upstash Redis
 * or Vercel's built-in rate limiting.
 */

const hits = new Map<string, { count: number; resetAt: number }>();

// Cleanup stale entries every 5 minutes to prevent memory leaks
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 5 * 60 * 1000;

function cleanupStaleEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of hits) {
    if (now > entry.resetAt) hits.delete(key);
  }
}

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  cleanupStaleEntries();
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, retryAfterMs: 0 };
  }

  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: entry.resetAt - now,
    };
  }

  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count, retryAfterMs: 0 };
}
