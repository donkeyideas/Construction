"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Wrench,
  Loader2,
  Download,
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

const FIX_ENDPOINTS: Record<string, string> = {
  "bank-reconciliation": "/api/financial/audit/sync-bank-balances",
  "unposted-entries": "/api/financial/audit/post-drafts",
  "invoice-je-coverage": "/api/financial/audit/fix-invoices",
  "missing-gl-mappings": "/api/financial/audit/fix-invoices",
  "orphaned-je-lines": "/api/financial/audit/fix-orphaned-lines",
  "duplicate-jes": "/api/financial/audit/fix-duplicates",
  "missing-vendor-client": "/api/financial/audit/fix-vendor-info",
  "payment-je-coverage": "/api/financial/audit/fix-invoices",
  "ar-reconciliation": "/api/financial/audit/fix-invoices",
  "ap-reconciliation": "/api/financial/audit/fix-invoices",
};

function AuditCheck({
  check,
  onFix,
  fixing,
  t,
}: {
  check: AuditCheckResult;
  onFix?: (checkId: string) => void;
  fixing?: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  const [expanded, setExpanded] = useState(check.status !== "pass");

  const STATUS_CONFIG = useMemo(() => ({
    pass: { icon: CheckCircle2, label: t("audit.pass"), color: "var(--color-green)" },
    warn: { icon: AlertTriangle, label: t("audit.warning"), color: "#fbbf24" },
    fail: { icon: XCircle, label: t("audit.fail"), color: "var(--color-red)" },
  }), [t]);

  const FIX_LABELS: Record<string, string> = useMemo(() => ({
    "bank-reconciliation": t("audit.fixSyncBankBalances"),
    "unposted-entries": t("audit.fixPostDrafts"),
    "invoice-je-coverage": t("audit.fixCreateMissingJEs"),
    "missing-gl-mappings": t("audit.fixAutoMapGL"),
    "orphaned-je-lines": t("audit.fixRemoveOrphaned"),
    "duplicate-jes": t("audit.fixRemoveDuplicates"),
    "missing-vendor-client": t("audit.fixSetUnknownNames"),
    "payment-je-coverage": t("audit.fixCreateMissingPaymentJEs"),
    "ar-reconciliation": t("audit.fixRecomputeFromInvoices"),
    "ap-reconciliation": t("audit.fixRecomputeFromInvoicesAP"),
  }), [t]);

  const config = STATUS_CONFIG[check.status];
  const Icon = config.icon;
  const hasDetails = check.details.length > 0;
  const hasFixAction = check.status !== "pass" && FIX_ENDPOINTS[check.id];
  const fixLabel = FIX_LABELS[check.id];

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
          {hasFixAction && onFix && fixLabel && (
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
              {fixing ? t("audit.fixing") : fixLabel}
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

function exportAuditCSV(audit: AuditResult, headers: string[]) {
  const rows = [headers];
  for (const check of audit.checks) {
    rows.push([check.name, check.status, check.summary, check.details.join("; ")]);
  }
  const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit-report-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AuditClient({ audit, companyName }: Props) {
  const router = useRouter();
  const t = useTranslations("financial");
  const [fixingId, setFixingId] = useState<string | null>(null);
  const [isRunningAll, setIsRunningAll] = useState(false);

  const passCount = audit.checks.filter((c) => c.status === "pass").length;
  const warnCount = audit.checks.filter((c) => c.status === "warn").length;
  const failCount = audit.checks.filter((c) => c.status === "fail").length;
  const totalChecks = audit.checks.length;

  // Deterministic date+time formatting to avoid hydration mismatch
  const runDateObj = new Date(audit.runAt);
  const MONTHS_LONG = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const runMonth = MONTHS_LONG[runDateObj.getMonth()];
  const runDay = runDateObj.getDate();
  const runYear = runDateObj.getFullYear();
  const runHour = runDateObj.getHours();
  const runMin = String(runDateObj.getMinutes()).padStart(2, "0");
  const runAmPm = runHour >= 12 ? "PM" : "AM";
  const runH12 = runHour % 12 || 12;
  const runDate = `${runMonth} ${runDay}, ${runYear} at ${runH12}:${runMin} ${runAmPm}`;

  const gradeColor = GRADE_COLORS[audit.grade] || "var(--muted)";

  const handleFix = async (checkId: string) => {
    const endpoint = FIX_ENDPOINTS[checkId];
    if (!endpoint) return;

    setFixingId(checkId);
    try {
      const res = await fetch(endpoint, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        alert(`${t("audit.fixFailed")}: ${data.error || t("audit.unknownError")}`);
      } else {
        router.refresh();
      }
    } catch {
      alert(t("audit.networkError"));
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
            {t("audit.title")}
          </h2>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: 2 }}>
            {t("audit.subtitle")}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{runDate}</span>
          <button
            className="ui-btn ui-btn-outline ui-btn-sm"
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
            onClick={() => exportAuditCSV(audit, [
              t("audit.csvCheck"),
              t("audit.csvStatus"),
              t("audit.csvSummary"),
              t("audit.csvDetails"),
            ])}
          >
            <Download size={14} />
            {t("audit.exportCsv")}
          </button>
          {failCount + warnCount > 0 && (
            <button
              className="ui-btn ui-btn-primary ui-btn-sm"
              style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
              disabled={isRunningAll}
              onClick={async () => {
                setIsRunningAll(true);
                const failedChecks = audit.checks.filter((c) => c.status !== "pass");
                for (const check of failedChecks) {
                  const endpoint = FIX_ENDPOINTS[check.id];
                  if (endpoint) {
                    try {
                      await fetch(endpoint, { method: "POST" });
                    } catch { /* continue */ }
                  }
                }
                setIsRunningAll(false);
                router.refresh();
              }}
            >
              {isRunningAll ? <Loader2 size={14} className="doc-spinner" /> : <Wrench size={14} />}
              {isRunningAll ? t("audit.repairing") : t("audit.runFullRepair")}
            </button>
          )}
          <a
            href="/financial/audit"
            className="ui-btn ui-btn-outline ui-btn-sm"
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <RefreshCw size={14} />
            {t("audit.reRun")}
          </a>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
        {/* Grade */}
        <div className="card kpi">
          <div className="kpi-info">
            <span className="kpi-label">{t("audit.overallGrade")}</span>
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
            <span className="kpi-label">{t("audit.totalChecks")}</span>
            <span className="kpi-value">{totalChecks}</span>
          </div>
          <div className="kpi-icon">
            <CheckCircle2 size={22} />
          </div>
        </div>

        {/* Passed */}
        <div className="card kpi">
          <div className="kpi-info">
            <span className="kpi-label">{t("audit.passed")}</span>
            <span className="kpi-value" style={{ color: "var(--color-green)" }}>{passCount}</span>
          </div>
          <div className="kpi-icon" style={{ color: "var(--color-green)" }}>
            <CheckCircle2 size={22} />
          </div>
        </div>

        {/* Warnings */}
        <div className="card kpi">
          <div className="kpi-info">
            <span className="kpi-label">{t("audit.warnings")}</span>
            <span className="kpi-value" style={{ color: "#fbbf24" }}>{warnCount}</span>
          </div>
          <div className="kpi-icon" style={{ color: "#fbbf24" }}>
            <AlertTriangle size={22} />
          </div>
        </div>

        {/* Failed */}
        <div className="card kpi">
          <div className="kpi-info">
            <span className="kpi-label">{t("audit.failed")}</span>
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
            {t("audit.resultsTitle", { companyName })}
          </div>
        </div>
        <div>
          {audit.checks.map((check) => (
            <AuditCheck
              key={check.id}
              check={check}
              onFix={handleFix}
              fixing={fixingId === check.id}
              t={t}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
