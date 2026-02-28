/**
 * Formatting utilities for the Buildwrk dashboard.
 */

const currencyFull = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const currencyPrecise = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format a number as full US currency (e.g., "$1,234,567").
 * Uses two decimal places when the amount is under $1,000.
 */
export function formatCurrency(amount: number): string {
  if (Math.abs(amount) < 1000) {
    return currencyPrecise.format(amount);
  }
  return currencyFull.format(amount);
}

/**
 * Format a number as compact US currency (e.g., "$47.2M", "$3.8K").
 * Falls back to full currency for amounts under $1,000.
 */
export function formatCompactCurrency(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";

  if (abs >= 1_000_000_000) {
    const val = abs / 1_000_000_000;
    return `${sign}$${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}B`;
  }
  if (abs >= 1_000_000) {
    const val = abs / 1_000_000;
    return `${sign}$${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    const val = abs / 1_000;
    return `${sign}$${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}K`;
  }
  return formatCurrency(amount);
}

/**
 * Format a number as a percentage (e.g., "94.2%").
 */
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Format a date as a relative time string (e.g., "5 minutes ago", "2 hours ago").
 */
export function formatRelativeTime(date: string | Date): string {
  const now = Date.now();
  const then = typeof date === "string" ? new Date(date).getTime() : date.getTime();
  const diffMs = now - then;

  if (diffMs < 0) return "just now";

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (seconds < 60) return "just now";
  if (minutes === 1) return "1 minute ago";
  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours === 1) return "1 hour ago";
  if (hours < 24) return `${hours} hours ago`;
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (weeks === 1) return "1 week ago";
  if (weeks < 5) return `${weeks} weeks ago`;
  if (months === 1) return "1 month ago";
  if (months < 12) return `${months} months ago`;

  return formatDateSafe(new Date(then).toISOString());
}

/**
 * Short month label from a date string (e.g., "Jan", "Feb").
 */
export function shortMonth(date: string | Date): string {
  const s = typeof date === "string" ? date : date.toISOString();
  const parts = s.split("T")[0].split("-");
  const mi = parseInt(parts[1], 10) - 1;
  if (mi < 0 || mi > 11) return "--";
  return MONTH_ABBR[mi];
}

/**
 * Deterministic date formatter — produces identical output on server and client.
 * Avoids toLocaleDateString() which differs by runtime/locale and causes React
 * hydration error #418.
 *
 * @example formatDateSafe("2026-02-15") → "Feb 15, 2026"
 * @example formatDateSafe("2026-02-15T00:00:00") → "Feb 15, 2026"
 */
const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function formatDateSafe(dateStr: string | null | undefined): string {
  if (!dateStr) return "--";
  const d = String(dateStr).split("T")[0];
  const parts = d.split("-");
  if (parts.length !== 3) return "--";
  const [y, m, day] = parts;
  const mi = parseInt(m, 10) - 1;
  if (mi < 0 || mi > 11) return "--";
  return `${MONTH_ABBR[mi]} ${parseInt(day, 10)}, ${y}`;
}

/**
 * Deterministic long date formatter (e.g., "February 15, 2026").
 */
const MONTH_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export function formatDateLong(dateStr: string | null | undefined): string {
  if (!dateStr) return "--";
  const d = String(dateStr).split("T")[0];
  const parts = d.split("-");
  if (parts.length !== 3) return "--";
  const [y, m, day] = parts;
  const mi = parseInt(m, 10) - 1;
  if (mi < 0 || mi > 11) return "--";
  return `${MONTH_FULL[mi]} ${parseInt(day, 10)}, ${y}`;
}

/**
 * Short date without year (e.g., "Feb 15").
 */
export function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return "--";
  const d = String(dateStr).split("T")[0];
  const parts = d.split("-");
  if (parts.length !== 3) return "--";
  const mi = parseInt(parts[1], 10) - 1;
  if (mi < 0 || mi > 11) return "--";
  return `${MONTH_ABBR[mi]} ${parseInt(parts[2], 10)}`;
}

/**
 * Month and year (e.g., "February 2026").
 */
export function formatMonthYear(dateStr: string | null | undefined): string {
  if (!dateStr) return "--";
  const d = String(dateStr).split("T")[0];
  const parts = d.split("-");
  if (parts.length < 2) return "--";
  const mi = parseInt(parts[1], 10) - 1;
  if (mi < 0 || mi > 11) return "--";
  return `${MONTH_FULL[mi]} ${parts[0]}`;
}

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Full date with weekday (e.g., "Thursday, February 15, 2026").
 */
export function formatDateFull(dateStr: string | null | undefined): string {
  if (!dateStr) return "--";
  const s = String(dateStr).split("T")[0];
  const [y, m, day] = s.split("-");
  const mi = parseInt(m, 10) - 1;
  const di = parseInt(day, 10);
  if (mi < 0 || mi > 11 || isNaN(di)) return "--";
  const dt = new Date(parseInt(y, 10), mi, di);
  return `${WEEKDAY_LONG[dt.getDay()]}, ${MONTH_FULL[mi]} ${di}, ${y}`;
}

/**
 * Short weekday name (e.g., "Thu").
 */
export function formatWeekdayShort(dateStr: string | null | undefined): string {
  if (!dateStr) return "--";
  const s = String(dateStr).split("T")[0];
  const [y, m, day] = s.split("-");
  const dt = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(day, 10));
  return WEEKDAY_SHORT[dt.getDay()];
}

/**
 * Long weekday name (e.g., "Thursday").
 */
export function formatWeekdayLong(dateStr: string | null | undefined): string {
  if (!dateStr) return "--";
  const s = String(dateStr).split("T")[0];
  const [y, m, day] = s.split("-");
  const dt = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(day, 10));
  return WEEKDAY_LONG[dt.getDay()];
}

/**
 * Long month name (e.g., "February").
 */
export function formatMonthLong(dateStr: string | null | undefined): string {
  if (!dateStr) return "--";
  const parts = String(dateStr).split("T")[0].split("-");
  const mi = parseInt(parts[1], 10) - 1;
  if (mi < 0 || mi > 11) return "--";
  return MONTH_FULL[mi];
}

/**
 * Format a Date object to ISO date string (YYYY-MM-DD) for use with deterministic formatters.
 */
export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Deterministic datetime formatter (e.g., "Feb 15, 2026, 3:45 PM").
 * Handles ISO timestamps and date-only strings.
 */
export function formatDateTimeSafe(dateStr: string | null | undefined): string {
  if (!dateStr) return "--";
  const d = new Date(String(dateStr));
  if (isNaN(d.getTime())) return "--";
  const mi = d.getMonth();
  const day = d.getDate();
  const yr = d.getFullYear();
  let h = d.getHours();
  const min = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${MONTH_ABBR[mi]} ${day}, ${yr}, ${h}:${min} ${ampm}`;
}

/**
 * Deterministic time formatter (e.g., "3:45 PM").
 */
export function formatTimeSafe(dateStr: string | null | undefined): string {
  if (!dateStr) return "--";
  const d = new Date(String(dateStr));
  if (isNaN(d.getTime())) return "--";
  let h = d.getHours();
  const min = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${min} ${ampm}`;
}

/**
 * Short weekday + short month + day (e.g., "Thu, Feb 15").
 */
export function formatWeekdayDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return "--";
  const s = String(dateStr).split("T")[0];
  const [y, m, day] = s.split("-");
  const mi = parseInt(m, 10) - 1;
  const di = parseInt(day, 10);
  if (mi < 0 || mi > 11 || isNaN(di)) return "--";
  const dt = new Date(parseInt(y, 10), mi, di);
  return `${WEEKDAY_SHORT[dt.getDay()]}, ${MONTH_ABBR[mi]} ${di}`;
}
