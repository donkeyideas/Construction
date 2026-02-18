"use client";

import { useState } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import type { AuditResult, AuditCheckResult } from "@/lib/queries/financial-audit";

interface Props {
  audit: AuditResult;
  companyName: string;
}

const STATUS_CONFIG = {
  pass: { icon: CheckCircle2, label: "Pass", className: "audit-status-pass" },
  warn: { icon: AlertTriangle, label: "Warning", className: "audit-status-warn" },
  fail: { icon: XCircle, label: "Fail", className: "audit-status-fail" },
};

function AuditCheck({ check }: { check: AuditCheckResult }) {
  const [expanded, setExpanded] = useState(check.status !== "pass");
  const config = STATUS_CONFIG[check.status];
  const Icon = config.icon;

  return (
    <div className={`audit-check ${config.className}`}>
      <div
        className="audit-check-header"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="audit-check-left">
          <Icon size={18} />
          <span className="audit-check-name">{check.name}</span>
        </div>
        <div className="audit-check-right">
          <span className={`audit-check-badge ${config.className}`}>
            {config.label}
          </span>
          {check.details.length > 0 && (
            expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
          )}
        </div>
      </div>
      <div className="audit-check-summary">{check.summary}</div>
      {expanded && check.details.length > 0 && (
        <div className="audit-check-details">
          <ul>
            {check.details.map((detail, idx) => (
              <li key={idx}>{detail}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function AuditClient({ audit, companyName }: Props) {
  const passCount = audit.checks.filter((c) => c.status === "pass").length;
  const warnCount = audit.checks.filter((c) => c.status === "warn").length;
  const failCount = audit.checks.filter((c) => c.status === "fail").length;

  const runDate = new Date(audit.runAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>Financial Audit</h2>
          <p className="fin-header-sub">
            Automated checks to verify data integrity and accounting accuracy
          </p>
        </div>
        <div className="fin-header-actions">
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

      {/* Grade Card */}
      <div className="audit-summary">
        <div className={`audit-grade-card audit-grade-${audit.grade}`}>
          <div className="audit-grade-letter">{audit.grade}</div>
          <div className="audit-grade-label">{audit.gradeLabel}</div>
        </div>
        <div className="audit-summary-stats">
          <div className="audit-stat">
            <ShieldCheck size={16} />
            <span className="audit-stat-label">Company</span>
            <span className="audit-stat-value">{companyName}</span>
          </div>
          <div className="audit-stat">
            <CheckCircle2 size={16} style={{ color: "var(--color-green)" }} />
            <span className="audit-stat-value">{passCount}</span>
            <span className="audit-stat-label">Passed</span>
          </div>
          <div className="audit-stat">
            <AlertTriangle size={16} style={{ color: "var(--color-amber)" }} />
            <span className="audit-stat-value">{warnCount}</span>
            <span className="audit-stat-label">Warnings</span>
          </div>
          <div className="audit-stat">
            <XCircle size={16} style={{ color: "var(--color-red)" }} />
            <span className="audit-stat-value">{failCount}</span>
            <span className="audit-stat-label">Failed</span>
          </div>
          <div className="audit-stat">
            <span className="audit-stat-label">Run at</span>
            <span className="audit-stat-value" style={{ fontSize: "0.82rem" }}>
              {runDate}
            </span>
          </div>
        </div>
      </div>

      {/* Checks */}
      <div className="audit-checks-list">
        {audit.checks.map((check) => (
          <AuditCheck key={check.id} check={check} />
        ))}
      </div>
    </div>
  );
}
