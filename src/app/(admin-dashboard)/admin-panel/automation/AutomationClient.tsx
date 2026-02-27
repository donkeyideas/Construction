"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Zap,
  Plus,
  Pencil,
  Trash2,
  X,
  Activity,
  CheckCircle2,
  XCircle,
  LayoutTemplate,
  Clock,
  FileText,
} from "lucide-react";
import {
  AUTOMATION_TEMPLATES,
  TRIGGER_TYPES,
  TRIGGER_ENTITIES,
  ACTION_TYPES,
  CONDITION_OPERATORS,
} from "@/lib/automation/templates";
import type {
  AutomationRuleRow,
  AutomationStats,
  AutomationCondition,
  AutomationAction,
} from "@/lib/queries/automation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AutomationClientProps {
  rules: AutomationRuleRow[];
  stats: AutomationStats;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AutomationClient({
  rules,
  stats,
}: AutomationClientProps) {
  const router = useRouter();
  const t = useTranslations("adminPanel");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formTriggerType, setFormTriggerType] = useState("entity_created");
  const [formTriggerEntity, setFormTriggerEntity] = useState("ticket");
  const [formConditions, setFormConditions] = useState<AutomationCondition[]>([]);
  const [formActions, setFormActions] = useState<AutomationAction[]>([]);

  // UI state
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // -----------------------------------------------------------------------
  // Open Add Modal
  // -----------------------------------------------------------------------
  function openAddModal() {
    setEditingId(null);
    setFormName("");
    setFormDescription("");
    setFormTriggerType("entity_created");
    setFormTriggerEntity("ticket");
    setFormConditions([]);
    setFormActions([]);
    setMessage(null);
    setShowModal(true);
  }

  // -----------------------------------------------------------------------
  // Open Edit Modal
  // -----------------------------------------------------------------------
  function openEditModal(rule: AutomationRuleRow) {
    setEditingId(rule.id);
    setFormName(rule.name);
    setFormDescription(rule.description ?? "");
    setFormTriggerType(rule.trigger_type);
    setFormTriggerEntity(rule.trigger_entity);
    setFormConditions(rule.conditions || []);
    setFormActions(rule.actions || []);
    setMessage(null);
    setShowModal(true);
  }

  // -----------------------------------------------------------------------
  // Use Template
  // -----------------------------------------------------------------------
  function useTemplate(template: typeof AUTOMATION_TEMPLATES[number]) {
    setEditingId(null);
    setFormName(template.name);
    setFormDescription(template.description);
    setFormTriggerType(template.trigger_type);
    setFormTriggerEntity(template.trigger_entity);
    setFormConditions(template.conditions as AutomationCondition[]);
    setFormActions(template.actions as AutomationAction[]);
    setMessage(null);
    setShowModal(true);
  }

  // -----------------------------------------------------------------------
  // Close Modal
  // -----------------------------------------------------------------------
  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setMessage(null);
  }

  // -----------------------------------------------------------------------
  // Save (Create / Update)
  // -----------------------------------------------------------------------
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSaving(true);

    try {
      const payload = {
        name: formName,
        description: formDescription,
        trigger_type: formTriggerType,
        trigger_entity: formTriggerEntity,
        conditions: formConditions,
        actions: formActions,
      };

      if (editingId) {
        const res = await fetch(`/api/admin/automation/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          setMessage({ type: "error", text: data.error || "Failed to update rule." });
          return;
        }

        setMessage({ type: "success", text: "Rule updated." });
      } else {
        const res = await fetch("/api/admin/automation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          setMessage({ type: "error", text: data.error || "Failed to create rule." });
          return;
        }

        setMessage({ type: "success", text: "Rule created." });
      }

      setTimeout(() => {
        closeModal();
        router.refresh();
      }, 800);
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  // -----------------------------------------------------------------------
  // Delete
  // -----------------------------------------------------------------------
  async function handleDelete(id: string) {
    if (!window.confirm("Delete this automation rule? This cannot be undone.")) return;

    try {
      const res = await fetch(`/api/admin/automation/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to delete.");
        return;
      }

      router.refresh();
    } catch {
      alert("Network error. Please try again.");
    }
  }

  // -----------------------------------------------------------------------
  // Toggle
  // -----------------------------------------------------------------------
  async function handleToggle(id: string, currentEnabled: boolean) {
    setTogglingId(id);

    try {
      const res = await fetch(`/api/admin/automation/${id}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !currentEnabled }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to toggle.");
        return;
      }

      router.refresh();
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setTogglingId(null);
    }
  }

  // -----------------------------------------------------------------------
  // Conditions Builder
  // -----------------------------------------------------------------------
  function addCondition() {
    setFormConditions((prev) => [
      ...prev,
      { field: "", operator: "equals", value: "" },
    ]);
  }

  function updateCondition(index: number, updates: Partial<AutomationCondition>) {
    setFormConditions((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...updates } : c))
    );
  }

  function removeCondition(index: number) {
    setFormConditions((prev) => prev.filter((_, i) => i !== index));
  }

  // -----------------------------------------------------------------------
  // Actions Builder
  // -----------------------------------------------------------------------
  function addAction() {
    setFormActions((prev) => [
      ...prev,
      { type: "send_notification", config: {} },
    ]);
  }

  function updateAction(index: number, updates: Partial<AutomationAction>) {
    setFormActions((prev) =>
      prev.map((a, i) => (i === index ? { ...a, ...updates } : a))
    );
  }

  function removeAction(index: number) {
    setFormActions((prev) => prev.filter((_, i) => i !== index));
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------
  function getTriggerLabel(type: string): string {
    return TRIGGER_TYPES.find((t) => t.value === type)?.label || type;
  }

  function getEntityLabel(entity: string): string {
    return TRIGGER_ENTITIES.find((e) => e.value === entity)?.label || entity;
  }

  function formatDate(ts: string | null): string {
    if (!ts) return "Never";
    return new Date(ts).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // Count failed today for stats
  const failedToday = 0; // This would come from logs; placeholder

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div>
      {/* Header */}
      <div className="automation-header">
        <div>
          <h2>{t("automation.title")}</h2>
          <p className="automation-header-sub">
            {t("automation.subtitle")}.
          </p>
        </div>
        <div className="automation-header-actions">
          <Link href="/admin-panel/automation/logs" className="btn-secondary">
            <FileText size={14} />
            {t("automation.viewLogs")}
          </Link>
          <button className="btn-primary" onClick={openAddModal}>
            <Plus size={16} />
            {t("automation.createRule")}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="automation-stats">
        <div className="automation-stat-card">
          <div className="automation-stat-icon blue">
            <Zap size={18} />
          </div>
          <div className="automation-stat-label">{t("automation.totalRules")}</div>
          <div className="automation-stat-value">{stats.total}</div>
        </div>
        <div className="automation-stat-card">
          <div className="automation-stat-icon green">
            <CheckCircle2 size={18} />
          </div>
          <div className="automation-stat-label">{t("automation.active")}</div>
          <div className="automation-stat-value">{stats.enabled}</div>
        </div>
        <div className="automation-stat-card">
          <div className="automation-stat-icon amber">
            <Activity size={18} />
          </div>
          <div className="automation-stat-label">{t("automation.executionsToday")}</div>
          <div className="automation-stat-value">{stats.executionsToday}</div>
        </div>
        <div className="automation-stat-card">
          <div className="automation-stat-icon red">
            <XCircle size={18} />
          </div>
          <div className="automation-stat-label">{t("automation.failedToday")}</div>
          <div className="automation-stat-value">{failedToday}</div>
        </div>
      </div>

      {/* Template Gallery */}
      <div className="automation-templates-section">
        <div className="automation-section-title">
          <LayoutTemplate size={16} />
          {t("automation.quickStartTemplates")}
        </div>
        <div className="automation-templates-grid">
          {AUTOMATION_TEMPLATES.map((template) => (
            <div key={template.name} className="automation-template-card">
              <div className="automation-template-name">{template.name}</div>
              <div className="automation-template-desc">{template.description}</div>
              <button
                className="btn-secondary automation-template-btn"
                onClick={() => useTemplate(template)}
              >
                {t("automation.useTemplate")}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Rules Table */}
      {rules.length > 0 ? (
        <div className="automation-table-wrap">
          <table className="automation-table">
            <thead>
              <tr>
                <th>{t("automation.thName")}</th>
                <th>{t("automation.thTrigger")}</th>
                <th>{t("automation.thEntity")}</th>
                <th>{t("automation.thStatus")}</th>
                <th>{t("automation.thLastRun")}</th>
                <th>{t("automation.thRunCount")}</th>
                <th>{t("automation.thActions")}</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id}>
                  <td>
                    <div className="automation-rule-name">{rule.name}</div>
                    {rule.description && (
                      <div className="automation-rule-desc">{rule.description}</div>
                    )}
                  </td>
                  <td>
                    <span className="automation-trigger-badge">
                      {getTriggerLabel(rule.trigger_type)}
                    </span>
                  </td>
                  <td className="automation-muted">
                    {getEntityLabel(rule.trigger_entity)}
                  </td>
                  <td>
                    <button
                      className={`automation-toggle ${rule.is_enabled ? "on" : ""}`}
                      onClick={() => handleToggle(rule.id, rule.is_enabled)}
                      disabled={togglingId === rule.id}
                      title={rule.is_enabled ? "Disable rule" : "Enable rule"}
                    />
                  </td>
                  <td className="automation-muted">
                    <div className="automation-last-run">
                      <Clock size={12} />
                      {formatDate(rule.last_run_at)}
                    </div>
                  </td>
                  <td className="automation-muted">{rule.run_count}</td>
                  <td>
                    <div className="automation-actions">
                      <button
                        className="automation-action-btn"
                        title="Edit"
                        onClick={() => openEditModal(rule)}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="automation-action-btn danger"
                        title="Delete"
                        onClick={() => handleDelete(rule.id)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="automation-empty">
          <Zap size={32} />
          <div className="automation-empty-title">{t("automation.noRulesYet")}</div>
          <div className="automation-empty-desc">
            {t("automation.noRulesDesc")}
          </div>
          <button className="btn-primary" onClick={openAddModal}>
            <Plus size={16} />
            {t("automation.createRule")}
          </button>
        </div>
      )}

      {/* ===== Create / Edit Modal ===== */}
      {showModal && (
        <>
          <div className="automation-modal-overlay" onClick={closeModal} />
          <div className="automation-modal">
            <button className="automation-modal-close" onClick={closeModal}>
              <X size={18} />
            </button>

            <div className="automation-modal-title">
              {editingId ? t("automation.editRule") : t("automation.createRuleTitle")}
            </div>
            <div className="automation-modal-desc">
              {editingId
                ? t("automation.editRuleDesc")
                : t("automation.createRuleDesc")}
            </div>

            {message && (
              <div className={`automation-message ${message.type}`}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleSave}>
              {/* Name */}
              <div className="automation-form-group">
                <label className="automation-form-label">Rule Name</label>
                <input
                  type="text"
                  className="automation-form-input"
                  placeholder="e.g. Auto-assign urgent tickets"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>

              {/* Description */}
              <div className="automation-form-group">
                <label className="automation-form-label">Description</label>
                <input
                  type="text"
                  className="automation-form-input"
                  placeholder="Brief description of what this rule does"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>

              {/* Trigger Type + Entity */}
              <div className="automation-form-row">
                <div className="automation-form-group">
                  <label className="automation-form-label">Trigger Type</label>
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
                  <label className="automation-form-label">Trigger Entity</label>
                  <select
                    className="automation-form-select"
                    value={formTriggerEntity}
                    onChange={(e) => setFormTriggerEntity(e.target.value)}
                  >
                    {TRIGGER_ENTITIES.map((e) => (
                      <option key={e.value} value={e.value}>
                        {e.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Conditions */}
              <div className="automation-builder-section">
                <div className="automation-builder-header">
                  <span className="automation-form-label">Conditions</span>
                  <button
                    type="button"
                    className="btn-secondary automation-add-btn"
                    onClick={addCondition}
                  >
                    <Plus size={13} />
                    Add
                  </button>
                </div>
                {formConditions.length === 0 && (
                  <div className="automation-builder-empty">No conditions (rule always fires)</div>
                )}
                {formConditions.map((cond, idx) => (
                  <div key={idx} className="automation-builder-row">
                    <input
                      type="text"
                      className="automation-form-input automation-builder-field"
                      placeholder="Field"
                      value={cond.field}
                      onChange={(e) => updateCondition(idx, { field: e.target.value })}
                    />
                    <select
                      className="automation-form-select automation-builder-op"
                      value={cond.operator}
                      onChange={(e) => updateCondition(idx, { operator: e.target.value })}
                    >
                      {CONDITION_OPERATORS.map((op) => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      className="automation-form-input automation-builder-val"
                      placeholder="Value"
                      value={Array.isArray(cond.value) ? cond.value.join(", ") : cond.value}
                      onChange={(e) => updateCondition(idx, { value: e.target.value })}
                    />
                    <button
                      type="button"
                      className="automation-builder-remove"
                      onClick={() => removeCondition(idx)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="automation-builder-section">
                <div className="automation-builder-header">
                  <span className="automation-form-label">Actions</span>
                  <button
                    type="button"
                    className="btn-secondary automation-add-btn"
                    onClick={addAction}
                  >
                    <Plus size={13} />
                    Add
                  </button>
                </div>
                {formActions.length === 0 && (
                  <div className="automation-builder-empty">No actions configured</div>
                )}
                {formActions.map((action, idx) => (
                  <div key={idx} className="automation-builder-row">
                    <select
                      className="automation-form-select automation-builder-type"
                      value={action.type}
                      onChange={(e) => updateAction(idx, { type: e.target.value })}
                    >
                      {ACTION_TYPES.map((a) => (
                        <option key={a.value} value={a.value}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="automation-builder-remove"
                      onClick={() => removeAction(idx)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="automation-modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saving}
                >
                  {saving
                    ? t("automation.saving")
                    : editingId
                    ? t("automation.updateRule")
                    : t("automation.createRule")}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
