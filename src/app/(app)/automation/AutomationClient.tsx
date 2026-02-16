"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  ClipboardList,
  CheckCircle,
  Zap,
  AlertCircle,
  Trash2,
  X,
  Plus,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types matching the actual DB schema                                */
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

const PRESETS: {
  name: string;
  description: string;
  trigger_type: string;
  trigger_entity: string;
}[] = [
  {
    name: "Overdue Invoice Alert",
    description: "Notify when an invoice is past due date",
    trigger_type: "field_change",
    trigger_entity: "invoices",
  },
  {
    name: "Change Order Submitted",
    description: "Alert team when a new change order is submitted",
    trigger_type: "record_created",
    trigger_entity: "change_orders",
  },
  {
    name: "Certificate Expiring Soon",
    description: "Warn when a safety certificate is about to expire",
    trigger_type: "schedule",
    trigger_entity: "certifications",
  },
  {
    name: "Safety Inspection Overdue",
    description: "Alert when a scheduled inspection is past due",
    trigger_type: "schedule",
    trigger_entity: "inspections",
  },
];

const TRIGGER_TYPES = [
  { value: "record_created", label: "Record Created" },
  { value: "field_change", label: "Field Changed" },
  { value: "schedule", label: "Scheduled" },
  { value: "threshold", label: "Threshold Reached" },
];

const TRIGGER_ENTITIES = [
  { value: "projects", label: "Projects" },
  { value: "invoices", label: "Invoices" },
  { value: "change_orders", label: "Change Orders" },
  { value: "rfis", label: "RFIs" },
  { value: "submittals", label: "Submittals" },
  { value: "daily_logs", label: "Daily Logs" },
  { value: "inspections", label: "Inspections" },
  { value: "certifications", label: "Certifications" },
  { value: "safety_incidents", label: "Safety Incidents" },
  { value: "payments", label: "Payments" },
];

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
          {t("automationRulesTab", { count: rules.length })}
        </button>
        <button
          className={`automation-tab ${tab === "logs" ? "active" : ""}`}
          onClick={() => setTab("logs")}
        >
          {t("automationActivityLogTab", { count: logs.length })}
        </button>
      </div>

      {/* Rules Tab */}
      {tab === "rules" && (
        <>
          {rules.length === 0 ? (
            <div className="automation-empty">
              <Zap size={48} style={{ color: "var(--muted)", marginBottom: 8 }} />
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
            <div className="automation-table-wrap">
              <table className="automation-table">
                <thead>
                  <tr>
                    <th>{t("automationColStatus")}</th>
                    <th>{t("automationColName")}</th>
                    <th>{t("automationColTrigger")}</th>
                    <th>{t("automationColEntity")}</th>
                    <th>{t("automationColExecutions")}</th>
                    <th>{t("automationColLastTriggered")}</th>
                    <th style={{ textAlign: "right" }}>{t("automationColActions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <button
                          className={`automation-toggle ${r.is_enabled ? "on" : ""}`}
                          onClick={() => handleToggle(r)}
                          disabled={toggling === r.id}
                          title={r.is_enabled ? t("automationDisableRule") : t("automationEnableRule")}
                        />
                      </td>
                      <td>
                        <div className="automation-rule-name">{r.name}</div>
                        {r.description && (
                          <div className="automation-rule-desc">
                            {r.description}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="automation-trigger-badge">
                          {r.trigger_type?.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="automation-muted">
                        {r.trigger_entity?.replace(/_/g, " ") ?? "\u2014"}
                      </td>
                      <td className="automation-muted">
                        {r.trigger_count || 0}
                      </td>
                      <td className="automation-muted">
                        {r.last_triggered_at
                          ? new Date(r.last_triggered_at).toLocaleDateString(dateLocale)
                          : t("automationNever")}
                      </td>
                      <td>
                        <div
                          className="automation-actions"
                          style={{ justifyContent: "flex-end" }}
                        >
                          {confirmDelete === r.id ? (
                            <>
                              <button
                                className="ui-btn ui-btn-sm ui-btn-ghost"
                                onClick={() => setConfirmDelete(null)}
                              >
                                {t("cancel")}
                              </button>
                              <button
                                className="ui-btn ui-btn-sm"
                                style={{
                                  background: "var(--color-red)",
                                  color: "#fff",
                                  borderColor: "var(--color-red)",
                                }}
                                onClick={() => handleDelete(r.id)}
                                disabled={deleting === r.id}
                              >
                                {deleting === r.id ? "..." : t("confirm")}
                              </button>
                            </>
                          ) : (
                            <button
                              className="automation-action-btn danger"
                              title={t("automationDeleteRule")}
                              onClick={() => setConfirmDelete(r.id)}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Preset Suggestions */}
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
                    className="ui-btn ui-btn-sm ui-btn-secondary automation-template-btn"
                    onClick={() => handlePreset(p)}
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
                      <span
                        className={`automation-status-badge ${l.status}`}
                      >
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
