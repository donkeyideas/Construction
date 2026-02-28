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

  return new Date(then).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Short month label from a date string (e.g., "Jan", "Feb").
 */
export function shortMonth(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { month: "short" });
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
