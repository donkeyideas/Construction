"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Wrench,
  Loader2,
} from "lucide-react";
import type { AuditResult, AuditCheckResult } from "@/lib/queries/financial-audit";

interface Props {
  audit: AuditResult;
  companyName: string;
}

const GRADE_COLORS: Record<string, string> = {
  A: "var(--color-green)",
  B: "#60a5fa",
  C: "#fbbf24",
  D: "#f97316",
  F: "var(--color-red)",
};

const STATUS_CONFIG = {
  pass: { icon: CheckCircle2, label: "Pass", color: "var(--color-green)" },
  warn: { icon: AlertTriangle, label: "Warning", color: "#fbbf24" },
  fail: { icon: XCircle, label: "Fail", color: "var(--color-red)" },
};

/* Fix action config for specific check IDs */
const FIX_ACTIONS: Record<string, { label: string; endpoint: string }> = {
  "bank-reconciliation": {
    label: "Sync Bank Balances from GL",
    endpoint: "/api/financial/audit/sync-bank-balances",
  },
  "unposted-entries": {
    label: "Post All Draft Entries",
    endpoint: "/api/financial/audit/post-drafts",
  },
  "invoice-je-coverage": {
    label: "Create Missing JEs",
    endpoint: "/api/financial/audit/fix-invoices",
  },
  "missing-gl-mappings": {
    label: "Auto-Map GL Accounts",
    endpoint: "/api/financial/audit/fix-invoices",
  },
};

function AuditCheck({
  check,
  onFix,
  fixing,
}: {
  check: AuditCheckResult;
  onFix?: (checkId: string) => void;
  fixing?: boolean;
}) {
  const [expanded, setExpanded] = useState(check.status !== "pass");
  const config = STATUS_CONFIG[check.status];
  const Icon = config.icon;
  const hasDetails = check.details.length > 0;
  const fixAction = check.status !== "pass" ? FIX_ACTIONS[check.id] : undefined;

  return (
    <div
      className="audit-check-row"
      style={{ cursor: hasDetails ? "pointer" : "default" }}
      onClick={() => hasDetails && setExpanded(!expanded)}
    >
      <div className="audit-check-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Icon size={16} style={{ color: config.color, flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>{check.name}</div>
            <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginTop: 2 }}>
              {check.summary}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {fixAction && onFix && (
            <button
              className="ui-btn ui-btn-sm ui-btn-outline"
              style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.75rem" }}
              disabled={fixing}
              onClick={(e) => {
                e.stopPropagation();
                onFix(check.id);
              }}
            >
              {fixing ? <Loader2 size={12} className="doc-spinner" /> : <Wrench size={12} />}
              {fixing ? "Fixing..." : fixAction.label}
            </button>
          )}
          <span
            style={{
              display: "inline-block",
              padding: "2px 10px",
              borderRadius: 20,
              fontSize: "0.75rem",
              fontWeight: 600,
              background: `color-mix(in srgb, ${config.color} 12%, transparent)`,
              color: config.color,
            }}
          >
            {config.label}
          </span>
          {hasDetails && (
            expanded
              ? <ChevronDown size={14} style={{ color: "var(--muted)" }} />
              : <ChevronRight size={14} style={{ color: "var(--muted)" }} />
          )}
        </div>
      </div>
      {expanded && hasDetails && (
        <div
          style={{
            marginTop: 10,
            padding: "10px 14px",
            background: "rgba(255,255,255,0.02)",
            borderRadius: 8,
            fontSize: "0.8rem",
            color: "var(--muted)",
            maxHeight: 200,
            overflowY: "auto",
          }}
        >
          {check.details.map((detail, idx) => (
            <div key={idx} style={{ marginBottom: 3, paddingLeft: 4 }}>
              {detail}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AuditClient({ audit, companyName }: Props) {
  const router = useRouter();
  const [fixingId, setFixingId] = useState<string | null>(null);

  const passCount = audit.checks.filter((c) => c.status === "pass").length;
  const warnCount = audit.checks.filter((c) => c.status === "warn").length;
  const failCount = audit.checks.filter((c) => c.status === "fail").length;
  const totalChecks = audit.checks.length;

  const runDate = new Date(audit.runAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const gradeColor = GRADE_COLORS[audit.grade] || "var(--muted)";

  const handleFix = async (checkId: string) => {
    const action = FIX_ACTIONS[checkId];
    if (!action) return;

    setFixingId(checkId);
    try {
      const res = await fetch(action.endpoint, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        alert(`Fix failed: ${data.error || "Unknown error"}`);
      } else {
        // Re-run audit to show updated results
        router.refresh();
      }
    } catch {
      alert("Network error while applying fix");
    } finally {
      setFixingId(null);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="dash-header">
        <div>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "2rem", fontWeight: 700 }}>
            Financial Audit
          </h2>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: 2 }}>
            Automated checks to verify data integrity and accounting accuracy
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{runDate}</span>
          <a
            href="/financial/audit"
            className="ui-btn ui-btn-outline ui-btn-md"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <RefreshCw size={14} />
            Re-run Audit
          </a>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
        {/* Grade */}
        <div className="card kpi">
          <div className="kpi-info">
            <span className="kpi-label">Overall Grade</span>
            <span className="kpi-value" style={{ color: gradeColor, fontSize: "2.5rem" }}>
              {audit.grade}
            </span>
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {audit.gradeLabel}
          </div>
        </div>

        {/* Total Checks */}
        <div className="card kpi">
          <div className="kpi-info">
            <span className="kpi-label">Total Checks</span>
            <span className="kpi-value">{totalChecks}</span>
          </div>
          <div className="kpi-icon">
            <CheckCircle2 size={22} />
          </div>
        </div>

        {/* Passed */}
        <div className="card kpi">
          <div className="kpi-info">
            <span className="kpi-label">Passed</span>
            <span className="kpi-value" style={{ color: "var(--color-green)" }}>{passCount}</span>
          </div>
          <div className="kpi-icon" style={{ color: "var(--color-green)" }}>
            <CheckCircle2 size={22} />
          </div>
        </div>

        {/* Warnings */}
        <div className="card kpi">
          <div className="kpi-info">
            <span className="kpi-label">Warnings</span>
            <span className="kpi-value" style={{ color: "#fbbf24" }}>{warnCount}</span>
          </div>
          <div className="kpi-icon" style={{ color: "#fbbf24" }}>
            <AlertTriangle size={22} />
          </div>
        </div>

        {/* Failed */}
        <div className="card kpi">
          <div className="kpi-info">
            <span className="kpi-label">Failed</span>
            <span className="kpi-value" style={{ color: "var(--color-red)" }}>{failCount}</span>
          </div>
          <div className="kpi-icon" style={{ color: "var(--color-red)" }}>
            <XCircle size={22} />
          </div>
        </div>
      </div>

      {/* Audit Checks */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)" }}>
          <div className="card-title" style={{ marginBottom: 0 }}>
            Audit Results — {companyName}
          </div>
        </div>
        <div>
          {audit.checks.map((check) => (
            <AuditCheck
              key={check.id}
              check={check}
              onFix={handleFix}
              fixing={fixingId === check.id}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
