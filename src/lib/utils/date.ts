/**
 * Utility to format dates safely for server-side rendering.
 *
 * The core issue: JavaScript's `new Date("2024-03-15")` parses date-only
 * strings as UTC midnight, which can show the wrong date when formatted
 * with toLocaleDateString in a different timezone. This causes hydration
 * error #418 when SSR timezone differs from the client.
 *
 * Fix: parse date-only strings (YYYY-MM-DD) as local dates.
 */

/**
 * Parse a date string as a local date (not UTC) to avoid timezone mismatch.
 * - "2024-03-15" → March 15 local time (not UTC)
 * - "2024-03-15T10:00:00Z" → keeps original timestamp
 * - Date objects → returned as-is
 */
export function parseLocalDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (dateOnly) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(value);
}

/**
 * Format a date string for display, avoiding UTC timezone issues.
 *
 * Usage:
 *   formatLocalDate("2024-03-15", { month: "short", day: "numeric" })
 *   // → "Mar 15" (consistent on server and client)
 */
export function formatLocalDate(
  value: string | Date | null | undefined,
  opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" },
  locale = "en-US",
): string {
  if (!value) return "—";
  return parseLocalDate(value).toLocaleDateString(locale, opts);
}
