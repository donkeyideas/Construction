"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { formatDateSafe, formatDateLong, formatDateShort, formatDateFull, formatMonthYear, formatWeekdayShort, formatMonthLong, toDateStr } from "@/lib/utils/format";
import {
  ClipboardList,
  CheckCircle,
  Zap,
  AlertCircle,
  Trash2,
  X,
  Plus,
  Pencil,
  MoreVertical,
  FileScan,
  ShieldAlert,
  CalendarClock,
  BadgeAlert,
  Award,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Rule {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_entity: string | null;
  trigger_config: Record<string, unknown>;
  conditions: unknown[];
  actions: unknown[];
  is_enabled: boolean;
  trigger_count: number;
  last_triggered_at: string | null;
  created_at: string;
}

interface LogEntry {
  id: string;
  rule_name: string;
  trigger_entity: string | null;
  status: string;
  error_message: string | null;
  execution_time_ms: number | null;
  actions_executed: unknown[];
  created_at: string;
  automation_rules?: { name: string };
}

/* ------------------------------------------------------------------ */
/*  Preset rule suggestions                                            */
/* ------------------------------------------------------------------ */

// Preset keys (labels are translated inside the component)
const PRESET_KEYS = [
  { key: "autoProcessInvoices", trigger_type: "field_change", trigger_entity: "invoices", icon: "file-scan", color: "blue" },
  { key: "safetyScoreAlert", trigger_type: "record_created", trigger_entity: "inspections", icon: "shield-alert", color: "amber" },
  { key: "leaseExpirationReminder", trigger_type: "schedule", trigger_entity: "certifications", icon: "calendar-clock", color: "purple" },
  { key: "budgetThresholdAlert", trigger_type: "threshold", trigger_entity: "projects", icon: "badge-alert", color: "red" },
] as const;

// Trigger type and entity keys
const TRIGGER_TYPE_KEYS = ["record_created", "field_change", "schedule", "threshold"] as const;
const TRIGGER_ENTITY_KEYS = ["projects", "invoices", "change_orders", "rfis", "submittals", "daily_logs", "inspections", "certifications", "safety_incidents", "payments"] as const;

/* ------------------------------------------------------------------ */
/*  Icon map for rule cards                                            */
/* ------------------------------------------------------------------ */
const ENTITY_ICON: Record<string, typeof FileScan> = {
  invoices: FileScan,
  inspections: ShieldAlert,
  certifications: Award,
  projects: BadgeAlert,
  change_orders: CalendarClock,
};

const ENTITY_COLOR: Record<string, string> = {
  invoices: "blue",
  inspections: "amber",
  certifications: "green",
  projects: "red",
  change_orders: "purple",
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AutomationClient({
  rules,
  logs,
}: {
  rules: Rule[];
  logs: LogEntry[];
}) {
  const t = useTranslations("app");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  const PRESETS = useMemo(() => PRESET_KEYS.map((p) => ({
    ...p,
    name: t(`automationPreset_${p.key}_name`),
    description: t(`automationPreset_${p.key}_desc`),
  })), [t]);

  const TRIGGER_TYPES = useMemo(() => TRIGGER_TYPE_KEYS.map((key) => ({
    value: key,
    label: t(`automationTrigger_${key}`),
  })), [t]);

  const TRIGGER_ENTITIES = useMemo(() => TRIGGER_ENTITY_KEYS.map((key) => ({
    value: key,
    label: t(`automationEntity_${key}`),
  })), [t]);

  const TRIGGER_TYPE_LABELS: Record<string, string> = useMemo(() => Object.fromEntries(
    TRIGGER_TYPE_KEYS.map((key) => [key, t(`automationTrigger_${key}`)])
  ), [t]);

  const ENTITY_LABELS: Record<string, string> = useMemo(() => Object.fromEntries(
    TRIGGER_ENTITY_KEYS.map((key) => [key, t(`automationEntity_${key}`)])
  ), [t]);

  const router = useRouter();
  const [tab, setTab] = useState<"rules" | "logs">("rules");
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formTriggerType, setFormTriggerType] = useState("record_created");
  const [formTriggerEntity, setFormTriggerEntity] = useState("");

  const resetForm = useCallback(() => {
    setFormName("");
    setFormDesc("");
    setFormTriggerType("record_created");
    setFormTriggerEntity("");
  }, []);

  const flash = useCallback(
    (type: "success" | "error", text: string) => {
      setMessage({ type, text });
      setTimeout(() => setMessage(null), 4000);
    },
    []
  );

  /* ---------- Create Rule ---------- */
  const handleCreate = async () => {
    if (!formName.trim() || !formTriggerType) return;
    setSaving(true);
    try {
      const res = await fetch("/api/automation/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDesc.trim() || null,
          trigger_type: formTriggerType,
          trigger_entity: formTriggerEntity || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        flash("error", err.error || t("automationCreateFailed"));
        return;
      }
      flash("success", t("automationRuleCreated"));
      setShowCreate(false);
      resetForm();
      router.refresh();
    } catch {
      flash("error", t("networkError"));
    } finally {
      setSaving(false);
    }
  };

  /* ---------- Use Preset ---------- */
  const handlePreset = (preset: (typeof PRESETS)[number]) => {
    setFormName(preset.name);
    setFormDesc(preset.description);
    setFormTriggerType(preset.trigger_type);
    setFormTriggerEntity(preset.trigger_entity);
    setShowCreate(true);
  };

  /* ---------- Toggle Rule ---------- */
  const handleToggle = async (rule: Rule) => {
    setToggling(rule.id);
    try {
      const res = await fetch(`/api/automation/rules/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_enabled: !rule.is_enabled }),
      });
      if (!res.ok) {
        flash("error", t("automationToggleFailed"));
        return;
      }
      router.refresh();
    } catch {
      flash("error", t("networkError"));
    } finally {
      setToggling(null);
    }
  };

  /* ---------- Delete Rule ---------- */
  const handleDelete = async (ruleId: string) => {
    setDeleting(ruleId);
    try {
      const res = await fetch(`/api/automation/rules/${ruleId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        flash("error", t("automationDeleteFailed"));
        return;
      }
      flash("success", t("automationRuleDeleted"));
      setConfirmDelete(null);
      router.refresh();
    } catch {
      flash("error", t("networkError"));
    } finally {
      setDeleting(null);
    }
  };

  /* ---------- Stats ---------- */
  const activeCount = rules.filter((r) => r.is_enabled).length;
  const totalExecutions = rules.reduce((sum, r) => sum + (r.trigger_count || 0), 0);
  const failedLogs = logs.filter((l) => l.status === "failed").length;

  /* ---------- Format last triggered ---------- */
  const formatLastTriggered = (dateStr: string | null) => {
    if (!dateStr) return t("automationNever");
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffHours < 1) return t("automationJustNow");
    if (diffHours < 24) return t("automationHoursAgo", { count: diffHours });
    if (diffDays === 0) return t("automationToday");
    if (diffDays === 1) return t("automationYesterday");
    return formatDateShort(toDateStr(d));
  };

  return (
    <div>
      {/* Header */}
      <div className="dash-header">
        <div>
          <h2>{t("automationTitle")}</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: "2px" }}>
            {t("automationRulesConfigured", { count: rules.length })}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button className="ui-btn ui-btn-primary ui-btn-md" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> {t("automationCreateRule")}
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`automation-message ${message.type}`}>{message.text}</div>
      )}

      {/* KPI Stats */}
      <div className="kpi-grid">
        <div className="card" style={{ padding: 20 }}>
          <div className="kpi">
            <div className="kpi-info">
              <span className="kpi-label">{t("automationTotalRules")}</span>
              <span className="kpi-value">{rules.length}</span>
            </div>
            <div className="kpi-icon" style={{ color: "var(--color-blue)" }}>
              <ClipboardList size={20} />
            </div>
          </div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div className="kpi">
            <div className="kpi-info">
              <span className="kpi-label">{t("automationActive")}</span>
              <span className="kpi-value">{activeCount}</span>
            </div>
            <div className="kpi-icon" style={{ color: "var(--color-green)" }}>
              <CheckCircle size={20} />
            </div>
          </div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div className="kpi">
            <div className="kpi-info">
              <span className="kpi-label">{t("automationExecutions")}</span>
              <span className="kpi-value">{totalExecutions}</span>
            </div>
            <div className="kpi-icon" style={{ color: "var(--color-amber)" }}>
              <Zap size={20} />
            </div>
          </div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div className="kpi">
            <div className="kpi-info">
              <span className="kpi-label">{t("automationFailed")}</span>
              <span className="kpi-value" style={{ color: failedLogs > 0 ? "var(--color-red)" : undefined }}>
                {failedLogs}
              </span>
            </div>
            <div className="kpi-icon" style={{ color: "var(--color-red)" }}>
              <AlertCircle size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="automation-tabs">
        <button
          className={`automation-tab ${tab === "rules" ? "active" : ""}`}
          onClick={() => setTab("rules")}
        >
          <Zap size={14} />
          {t("automationRulesTab", { count: rules.length })}
        </button>
        <button
          className={`automation-tab ${tab === "logs" ? "active" : ""}`}
          onClick={() => setTab("logs")}
        >
          <ClipboardList size={14} />
          {t("automationActivityLogTab", { count: logs.length })}
        </button>
      </div>

      {/* Rules Tab */}
      {tab === "rules" && (
        <>
          {rules.length === 0 ? (
            <div className="automation-empty">
              <Zap size={48} style={{ color: "var(--muted)" }} />
              <p className="automation-empty-title">{t("automationNoRulesTitle")}</p>
              <p className="automation-empty-desc">
                {t("automationNoRulesDesc")}
              </p>
              <button
                className="ui-btn ui-btn-primary ui-btn-md"
                onClick={() => setShowCreate(true)}
              >
                <Plus size={16} /> {t("automationCreateFirstRule")}
              </button>
            </div>
          ) : (
            <div className="automation-rules-list">
              {rules.map((r) => {
                const IconComp = (r.trigger_entity && ENTITY_ICON[r.trigger_entity]) || Zap;
                const iconColor = (r.trigger_entity && ENTITY_COLOR[r.trigger_entity]) || "blue";
                return (
                  <div key={r.id} className="automation-rule-card">
                    {/* Card Header */}
                    <div className="automation-rule-card-header">
                      <div className="automation-rule-card-left">
                        <div className={`automation-rule-icon ${iconColor}`}>
                          <IconComp size={20} />
                        </div>
                        <div>
                          <h3 className="automation-rule-card-name">{r.name}</h3>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                            <span className={`automation-active-badge ${r.is_enabled ? "active" : "inactive"}`}>
                              <span className="automation-active-dot" />
                              {r.is_enabled ? t("automationStatusActive") : t("automationStatusInactive")}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="automation-rule-card-actions">
                        <button
                          className="automation-icon-btn"
                          onClick={() => handleToggle(r)}
                          disabled={toggling === r.id}
                          title={r.is_enabled ? t("automationDisableRule") : t("automationEnableRule")}
                        >
                          <Pencil size={16} />
                        </button>
                        {confirmDelete === r.id ? (
                          <div style={{ display: "flex", gap: 4 }}>
                            <button className="ui-btn ui-btn-sm ui-btn-ghost" onClick={() => setConfirmDelete(null)}>
                              {t("cancel")}
                            </button>
                            <button
                              className="ui-btn ui-btn-sm"
                              style={{ background: "var(--color-red)", color: "#fff", borderColor: "var(--color-red)" }}
                              onClick={() => handleDelete(r.id)}
                              disabled={deleting === r.id}
                            >
                              {deleting === r.id ? "..." : t("confirm")}
                            </button>
                          </div>
                        ) : (
                          <button
                            className="automation-icon-btn"
                            onClick={() => setConfirmDelete(r.id)}
                            title={t("automationDeleteRule")}
                          >
                            <MoreVertical size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Card Body - 3-column grid */}
                    <div className="automation-rule-card-grid">
                      <div>
                        <p className="automation-rule-card-label">{t("automationLabelTrigger")}</p>
                        <p className="automation-rule-card-value">
                          {TRIGGER_TYPE_LABELS[r.trigger_type] || r.trigger_type?.replace(/_/g, " ")}
                          {r.trigger_entity ? ` ${t("automationOnEntity")} ${ENTITY_LABELS[r.trigger_entity] || r.trigger_entity}` : ""}
                        </p>
                      </div>
                      <div>
                        <p className="automation-rule-card-label">{t("automationLabelCondition")}</p>
                        <p className="automation-rule-card-value">
                          {r.conditions && r.conditions.length > 0
                            ? t("automationConditionsConfigured", { count: r.conditions.length })
                            : t("automationNoConditions")}
                        </p>
                      </div>
                      <div>
                        <p className="automation-rule-card-label">{t("automationLabelAction")}</p>
                        <p className="automation-rule-card-value">
                          {r.actions && r.actions.length > 0
                            ? t("automationActionsConfigured", { count: r.actions.length })
                            : r.description || t("automationNoActions")}
                        </p>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="automation-rule-card-footer">
                      <span>
                        {t("automationRuns")}: <strong>{t("automationTimesTotal", { count: r.trigger_count || 0 })}</strong>
                      </span>
                      <span className="automation-rule-card-sep">|</span>
                      <span>
                        {t("automationLast")}: <strong>{formatLastTriggered(r.last_triggered_at)}</strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Preset Templates */}
          <div className="automation-templates-section">
            <h3 className="automation-section-title">
              <Zap size={18} />
              {t("automationQuickStartTemplates")}
            </h3>
            <div className="automation-templates-grid">
              {PRESETS.map((p) => (
                <div className="automation-template-card" key={p.name}>
                  <div className="automation-template-name">{p.name}</div>
                  <div className="automation-template-desc">{p.description}</div>
                  <button
                    className="ui-btn ui-btn-sm ui-btn-secondary"
                    onClick={() => handlePreset(p)}
                    style={{ alignSelf: "flex-start", marginTop: "auto" }}
                  >
                    {t("automationUseTemplate")}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Logs Tab */}
      {tab === "logs" && (
        <div className="automation-table-wrap">
          <table className="automation-table">
            <thead>
              <tr>
                <th>{t("automationLogDate")}</th>
                <th>{t("automationLogRule")}</th>
                <th>{t("automationLogEntity")}</th>
                <th>{t("automationLogStatus")}</th>
                <th>{t("automationLogDuration")}</th>
                <th>{t("automationLogError")}</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      textAlign: "center",
                      padding: "2rem",
                      color: "var(--muted)",
                    }}
                  >
                    {t("automationNoActivity")}
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.id}>
                    <td className="automation-muted">
                      {new Date(l.created_at).toLocaleString(dateLocale)}
                    </td>
                    <td>
                      {l.automation_rules?.name ?? l.rule_name ?? "\u2014"}
                    </td>
                    <td className="automation-muted">
                      {l.trigger_entity?.replace(/_/g, " ") ?? "\u2014"}
                    </td>
                    <td>
                      <span className={`automation-status-badge ${l.status}`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="automation-muted">
                      {l.execution_time_ms != null
                        ? `${l.execution_time_ms}ms`
                        : "\u2014"}
                    </td>
                    <td style={{ color: "var(--color-red)", fontSize: "0.82rem" }}>
                      {l.error_message ?? "\u2014"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Rule Modal */}
      {showCreate && (
        <>
          <div
            className="automation-modal-overlay"
            onClick={() => {
              setShowCreate(false);
              resetForm();
            }}
          />
          <div className="automation-modal">
            <button
              className="automation-modal-close"
              onClick={() => {
                setShowCreate(false);
                resetForm();
              }}
            >
              <X size={18} />
            </button>
            <h3 className="automation-modal-title">{t("automationCreateRuleTitle")}</h3>
            <p className="automation-modal-desc">
              {t("automationCreateRuleDesc")}
            </p>

            <div className="automation-form-group">
              <label className="automation-form-label">{t("automationRuleName")} *</label>
              <input
                className="automation-form-input"
                placeholder={t("automationRuleNamePlaceholder")}
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div className="automation-form-group">
              <label className="automation-form-label">{t("automationDescription")}</label>
              <input
                className="automation-form-input"
                placeholder={t("automationDescriptionPlaceholder")}
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
              />
            </div>

            <div className="automation-form-row">
              <div className="automation-form-group">
                <label className="automation-form-label">{t("automationTriggerType")} *</label>
                <select
                  className="automation-form-select"
                  value={formTriggerType}
                  onChange={(e) => setFormTriggerType(e.target.value)}
                >
                  {TRIGGER_TYPES.map((tt) => (
                    <option key={tt.value} value={tt.value}>
                      {tt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="automation-form-group">
                <label className="automation-form-label">{t("automationEntity")}</label>
                <select
                  className="automation-form-select"
                  value={formTriggerEntity}
                  onChange={(e) => setFormTriggerEntity(e.target.value)}
                >
                  <option value="">{t("automationSelectEntity")}</option>
                  {TRIGGER_ENTITIES.map((e) => (
                    <option key={e.value} value={e.value}>
                      {e.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="automation-modal-footer">
              <button
                className="ui-btn ui-btn-md ui-btn-ghost"
                onClick={() => {
                  setShowCreate(false);
                  resetForm();
                }}
              >
                {t("cancel")}
              </button>
              <button
                className="ui-btn ui-btn-md ui-btn-primary"
                disabled={!formName.trim() || !formTriggerType || saving}
                onClick={handleCreate}
              >
                {saving ? t("automationCreating") : t("automationCreateRule")}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
