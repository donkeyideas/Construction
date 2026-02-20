"use client";

interface Props {
  score: number;
  type: "vendor" | "bid" | "safety" | "risk";
  size?: "sm" | "md";
}

/**
 * Reusable inline badge for displaying AI-computed scores.
 *
 * Renders contextually based on `type`:
 * - **vendor**: Letter grade A-F with colour coding
 * - **bid**: Win probability % with green/amber/red colour
 * - **safety** / **risk**: Risk level label with severity colour
 */
export default function AIScoreBadge({ score, type, size = "sm" }: Props) {
  const sizeStyles: React.CSSProperties =
    size === "md"
      ? { fontSize: "0.82rem", padding: "3px 12px" }
      : {}; // sm uses the default .ai-score-badge sizes

  // ------------------------------------------------------------------
  // Vendor: letter grade
  // ------------------------------------------------------------------
  if (type === "vendor") {
    const grade = getVendorGrade(score);
    const gradeClass = `score-${grade.toLowerCase()}` as
      | "score-a"
      | "score-b"
      | "score-c"
      | "score-d"
      | "score-f";

    return (
      <span
        className={`ai-score-badge ${gradeClass}`}
        style={sizeStyles}
        title={`Vendor score: ${score}/100 (Grade ${grade})`}
      >
        {grade}
      </span>
    );
  }

  // ------------------------------------------------------------------
  // Bid: probability %
  // ------------------------------------------------------------------
  if (type === "bid") {
    const pct = Math.round(score * 100);
    let colorClass: string;
    if (pct >= 60) {
      colorClass = "score-a"; // green
    } else if (pct >= 30) {
      colorClass = "score-c"; // amber
    } else {
      colorClass = "score-f"; // red
    }

    return (
      <span
        className={`ai-score-badge ${colorClass}`}
        style={sizeStyles}
        title={`Win probability: ${pct}%`}
      >
        {pct}%
      </span>
    );
  }

  // ------------------------------------------------------------------
  // Safety / Risk: level label
  // ------------------------------------------------------------------
  const level = getRiskLevel(score);
  const levelColorClass = getRiskColorClass(level);
  const label = level.charAt(0).toUpperCase() + level.slice(1);

  return (
    <span
      className={`ai-score-badge ${levelColorClass}`}
      style={sizeStyles}
      title={`${type === "safety" ? "Safety risk" : "Risk"} score: ${score}/100 (${label})`}
    >
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getVendorGrade(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function getRiskLevel(
  score: number
): "low" | "medium" | "high" | "critical" {
  if (score <= 25) return "low";
  if (score <= 50) return "medium";
  if (score <= 75) return "high";
  return "critical";
}

function getRiskColorClass(level: "low" | "medium" | "high" | "critical"): string {
  switch (level) {
    case "low":
      return "score-a"; // green
    case "medium":
      return "score-c"; // amber
    case "high":
      return "score-f"; // red
    case "critical":
      return "score-d"; // dark orange / dark red
    default:
      return "score-c";
  }
}
