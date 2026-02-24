/**
 * Timezone utilities for Buildwrk.
 *
 * Problem: Vercel servers run in UTC. US construction workers clock in/out
 * in local time. Using `new Date().toISOString().slice(0,10)` on the server
 * returns the UTC date, which can be a day ahead of the user's local date
 * in the evening (e.g., 8 PM EST = 1 AM UTC next day).
 *
 * Solution: Use Intl.DateTimeFormat to convert UTC timestamps to dates in the
 * platform timezone. Works identically on server (Node.js) and client (browser).
 *
 * TODO: Make PLATFORM_TZ configurable per company (store in `companies` table).
 */

/** Default timezone — US-focused construction app */
export const PLATFORM_TZ = "America/New_York";

/**
 * Convert a Date or ISO timestamp string to YYYY-MM-DD in the platform timezone.
 * Works on both server (UTC Node.js) and client (browser).
 *
 * Example: At 1:00 AM UTC on Feb 24, returns "2026-02-23" for America/New_York.
 */
export function toTzDateStr(
  date: Date | string,
  tz: string = PLATFORM_TZ
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d);
}

/**
 * Get today's YYYY-MM-DD in the platform timezone.
 * Use this on the SERVER instead of `new Date().toISOString().slice(0, 10)`.
 */
export function getTzToday(tz: string = PLATFORM_TZ): string {
  return toTzDateStr(new Date(), tz);
}

/**
 * Get YYYY-MM-DD in the browser's local timezone.
 * Use this on the CLIENT for form defaults and local display.
 */
export function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Get today's YYYY-MM-DD in the browser's local timezone.
 */
export function getLocalToday(): string {
  return toLocalDateStr(new Date());
}

/**
 * Add days to a YYYY-MM-DD string and return a new YYYY-MM-DD string.
 */
export function addDaysToDateStr(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00Z"); // noon UTC avoids DST edge
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
