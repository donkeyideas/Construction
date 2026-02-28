/**
 * Utility to format dates safely for server-side rendering.
 *
 * The core issue: JavaScript's `new Date("2024-03-15")` parses date-only
 * strings as UTC midnight, which can show the wrong date when formatted
 * with toLocaleDateString in a different timezone. This causes hydration
 * error #418 when SSR timezone differs from the client.
 *
 * Fix: parse date-only strings (YYYY-MM-DD) as local dates, and use
 * deterministic string-based formatting (no toLocaleDateString).
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

const _MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const _MONTHS_LONG = ["January","February","March","April","May","June","July","August","September","October","November","December"];

/**
 * Deterministic date formatter — produces identical output on server and client.
 * Replaces toLocaleDateString() which causes React hydration error #418.
 */
export function formatLocalDate(
  value: string | Date | null | undefined,
  opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" },
): string {
  if (!value) return "—";
  const d = parseLocalDate(value);
  const mi = d.getMonth();
  const day = d.getDate();
  const yr = d.getFullYear();
  if (isNaN(mi) || isNaN(day) || isNaN(yr)) return "—";

  const months = opts.month === "long" ? _MONTHS_LONG : _MONTHS_SHORT;
  const monthStr = months[mi];

  if (opts.year === "numeric" && opts.day === "numeric") {
    return `${monthStr} ${day}, ${yr}`;
  }
  if (opts.day === "numeric") {
    return `${monthStr} ${day}`;
  }
  if (opts.year === "numeric") {
    return `${monthStr} ${yr}`;
  }
  return monthStr;
}
