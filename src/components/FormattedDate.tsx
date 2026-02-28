"use client";

/**
 * Renders a formatted date string deterministically to prevent
 * React error #418 caused by server/client locale/timezone differences.
 *
 * Uses manual string parsing instead of toLocaleDateString() which
 * produces different output on Node.js server vs browser client.
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

const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_LONG = ["January","February","March","April","May","June","July","August","September","October","November","December"];

/**
 * Parse a date string as a local date to avoid UTC timezone offset issues.
 * "2024-03-15" → March 15 (local), not March 14 (if UTC-5)
 */
function parseLocalDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (dateOnly) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(value);
}

/**
 * Deterministic date formatting — identical output on server and client.
 */
function formatDeterministic(
  value: string | Date,
  opts: { month?: string; day?: string; year?: string }
): string {
  const d = parseLocalDate(value);
  const mi = d.getMonth();
  const dayNum = d.getDate();
  const yr = d.getFullYear();

  if (isNaN(mi) || isNaN(dayNum) || isNaN(yr)) return "--";

  let monthStr = "";
  if (opts.month === "long") monthStr = MONTH_LONG[mi];
  else if (opts.month === "short") monthStr = MONTH_SHORT[mi];
  else if (opts.month === "numeric") monthStr = String(mi + 1);
  else if (opts.month === "2-digit") monthStr = String(mi + 1).padStart(2, "0");

  const dayStr = opts.day === "2-digit" ? String(dayNum).padStart(2, "0") : String(dayNum);
  const yearStr = opts.year === "2-digit" ? String(yr).slice(-2) : String(yr);

  if (opts.month && opts.day && opts.year) return `${monthStr} ${dayStr}, ${yearStr}`;
  if (opts.month && opts.day) return `${monthStr} ${dayStr}`;
  if (opts.month && opts.year) return `${monthStr} ${yearStr}`;
  if (opts.month) return monthStr;
  return `${monthStr} ${dayStr}, ${yearStr}`;
}

export default function FormattedDate({
  value,
  month = "short",
  day = "numeric",
  year,
  fallback = "—",
}: FormattedDateProps) {
  if (!value) return <span>{fallback}</span>;

  const formatted = formatDeterministic(value, { month, day, year });

  return <span>{formatted}</span>;
}

/** Utility for non-React contexts: parse a date safely as local time */
export { parseLocalDate };
