"use client";

/**
 * Renders a formatted date string with suppressHydrationWarning to prevent
 * React error #418 caused by server/client timezone differences.
 *
 * The key fix: date-only strings like "2024-03-15" are parsed as local dates
 * (not UTC) so they produce the same output on server and client.
 *
 * Usage:
 *   <FormattedDate value="2024-03-15" month="short" day="numeric" year="numeric" />
 */
interface FormattedDateProps {
  value: string | Date | null | undefined;
  month?: "short" | "long" | "numeric" | "2-digit";
  day?: "numeric" | "2-digit";
  year?: "numeric" | "2-digit";
  weekday?: "short" | "long" | "narrow";
  locale?: string;
  fallback?: string;
}

/**
 * Parse a date string as a local date to avoid UTC timezone offset issues.
 * "2024-03-15" → March 15 (local), not March 14 (if UTC-5)
 */
function parseLocalDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  // Date-only strings (YYYY-MM-DD) are parsed as UTC by JS spec,
  // causing timezone mismatches. Parse as local instead.
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (dateOnly) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(value);
}

export default function FormattedDate({
  value,
  month = "short",
  day = "numeric",
  year,
  weekday,
  locale = "en-US",
  fallback = "—",
}: FormattedDateProps) {
  if (!value) return <span>{fallback}</span>;

  const opts: Intl.DateTimeFormatOptions = {};
  if (month) opts.month = month;
  if (day) opts.day = day;
  if (year) opts.year = year;
  if (weekday) opts.weekday = weekday;

  const formatted = parseLocalDate(value).toLocaleDateString(locale, opts);

  return <span suppressHydrationWarning>{formatted}</span>;
}

/** Utility for non-React contexts: parse a date safely as local time */
export { parseLocalDate };
