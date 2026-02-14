"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

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
        flash("error", err.error || "Failed to create rule");
        return;
      }
      flash("success", "Rule created successfully");
      setShowCreate(false);
      resetForm();
      router.refresh();
    } catch {
      flash("error", "Network error");
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
        flash("error", "Failed to toggle rule");
        return;
      }
      router.refresh();
    } catch {
      flash("error", "Network error");
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
        flash("error", "Failed to delete rule");
        return;
      }
      flash("success", "Rule deleted");
      setConfirmDelete(null);
      router.refresh();
    } catch {
      flash("error", "Network error");
    } finally {
      setDeleting(null);
    }
  };

  /* ---------- Stats ---------- */
  const activeCount = rules.filter((r) => r.is_enabled).length;
  const totalExecutions = rules.reduce((sum, r) => sum + (r.trigger_count || 0), 0);
  const failedLogs = logs.filter((l) => l.status === "failed").length;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="automation-header">
        <div>
          <h2>Automation</h2>
          <p className="automation-header-sub">
            {rules.length} rule{rules.length !== 1 ? "s" : ""} configured
          </p>
        </div>
        <div className="automation-header-actions">
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + Create Rule
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`automation-message ${message.type}`}>{message.text}</div>
      )}

      {/* Stats */}
      <div className="automation-stats">
        <div className="automation-stat-card">
          <div className="automation-stat-icon blue">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          </div>
          <span className="automation-stat-label">Total Rules</span>
          <span className="automation-stat-value">{rules.length}</span>
        </div>
        <div className="automation-stat-card">
          <div className="automation-stat-icon green">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7" /></svg>
          </div>
          <span className="automation-stat-label">Active</span>
          <span className="automation-stat-value">{activeCount}</span>
        </div>
        <div className="automation-stat-card">
          <div className="automation-stat-icon amber">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <span className="automation-stat-label">Executions</span>
          <span className="automation-stat-value">{totalExecutions}</span>
        </div>
        <div className="automation-stat-card">
          <div className="automation-stat-icon red">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <span className="automation-stat-label">Failed</span>
          <span className="automation-stat-value">{failedLogs}</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        <button
          className={`tab-btn ${tab === "rules" ? "tab-btn-active" : ""}`}
          onClick={() => setTab("rules")}
        >
          Rules ({rules.length})
        </button>
        <button
          className={`tab-btn ${tab === "logs" ? "tab-btn-active" : ""}`}
          onClick={() => setTab("logs")}
        >
          Activity Log ({logs.length})
        </button>
      </div>

      {/* Rules Tab */}
      {tab === "rules" && (
        <>
          {rules.length === 0 ? (
            <div className="automation-empty">
              <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--muted)", marginBottom: 8 }}>
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <p className="automation-empty-title">No automation rules yet</p>
              <p className="automation-empty-desc">
                Create rules to automate notifications, status changes, and
                workflows across your projects.
              </p>
              <button
                className="btn btn-primary"
                onClick={() => setShowCreate(true)}
              >
                + Create Your First Rule
              </button>
            </div>
          ) : (
            <div className="automation-table-wrap">
              <table className="automation-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Name</th>
                    <th>Trigger</th>
                    <th>Entity</th>
                    <th>Executions</th>
                    <th>Last Triggered</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
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
                          title={r.is_enabled ? "Disable rule" : "Enable rule"}
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
                        {r.trigger_entity?.replace(/_/g, " ") ?? "—"}
                      </td>
                      <td className="automation-muted">
                        {r.trigger_count || 0}
                      </td>
                      <td className="automation-muted">
                        {r.last_triggered_at
                          ? new Date(r.last_triggered_at).toLocaleDateString()
                          : "Never"}
                      </td>
                      <td>
                        <div
                          className="automation-actions"
                          style={{ justifyContent: "flex-end" }}
                        >
                          {confirmDelete === r.id ? (
                            <>
                              <button
                                className="btn btn-sm"
                                style={{ fontSize: "0.75rem" }}
                                onClick={() => setConfirmDelete(null)}
                              >
                                Cancel
                              </button>
                              <button
                                className="btn btn-sm"
                                style={{
                                  fontSize: "0.75rem",
                                  background: "var(--color-red)",
                                  color: "#fff",
                                  borderColor: "var(--color-red)",
                                }}
                                onClick={() => handleDelete(r.id)}
                                disabled={deleting === r.id}
                              >
                                {deleting === r.id ? "..." : "Confirm"}
                              </button>
                            </>
                          ) : (
                            <button
                              className="automation-action-btn danger"
                              title="Delete rule"
                              onClick={() => setConfirmDelete(r.id)}
                            >
                              <svg
                                width="16"
                                height="16"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
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
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              Quick Start Templates
            </h3>
            <div className="automation-templates-grid">
              {PRESETS.map((p) => (
                <div className="automation-template-card" key={p.name}>
                  <div className="automation-template-name">{p.name}</div>
                  <div className="automation-template-desc">{p.description}</div>
                  <button
                    className="btn btn-sm automation-template-btn"
                    onClick={() => handlePreset(p)}
                  >
                    Use Template
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
                <th>Date</th>
                <th>Rule</th>
                <th>Entity</th>
                <th>Status</th>
                <th>Duration</th>
                <th>Error</th>
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
                      color: "var(--text-secondary)",
                    }}
                  >
                    No automation activity yet
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.id}>
                    <td className="automation-muted">
                      {new Date(l.created_at).toLocaleString()}
                    </td>
                    <td>
                      {l.automation_rules?.name ?? l.rule_name ?? "—"}
                    </td>
                    <td className="automation-muted">
                      {l.trigger_entity?.replace(/_/g, " ") ?? "—"}
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
                        : "—"}
                    </td>
                    <td style={{ color: "var(--color-red)", fontSize: "0.82rem" }}>
                      {l.error_message ?? "—"}
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
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h3 className="automation-modal-title">Create Automation Rule</h3>
            <p className="automation-modal-desc">
              Set up a trigger-based rule to automate notifications and
              workflows.
            </p>

            <div className="automation-form-group">
              <label className="automation-form-label">Rule Name *</label>
              <input
                className="automation-form-input"
                placeholder="e.g. Overdue Invoice Alert"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div className="automation-form-group">
              <label className="automation-form-label">Description</label>
              <input
                className="automation-form-input"
                placeholder="What does this rule do?"
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
              />
            </div>

            <div className="automation-form-row">
              <div className="automation-form-group">
                <label className="automation-form-label">Trigger Type *</label>
                <select
                  className="automation-form-select"
                  value={formTriggerType}
                  onChange={(e) => setFormTriggerType(e.target.value)}
                >
                  {TRIGGER_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="automation-form-group">
                <label className="automation-form-label">Entity</label>
                <select
                  className="automation-form-select"
                  value={formTriggerEntity}
                  onChange={(e) => setFormTriggerEntity(e.target.value)}
                >
                  <option value="">Select entity...</option>
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
                className="btn"
                onClick={() => {
                  setShowCreate(false);
                  resetForm();
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={!formName.trim() || !formTriggerType || saving}
                onClick={handleCreate}
              >
                {saving ? "Creating..." : "Create Rule"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
