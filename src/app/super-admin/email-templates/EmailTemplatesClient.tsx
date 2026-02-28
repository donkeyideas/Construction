"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { formatDateSafe } from "@/lib/utils/format";
import {
  Mail,
  FileText,
  Code,
  Eye,
  Trash2,
  Plus,
  Check,
  X,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  category: "system" | "billing" | "notification" | "marketing" | "onboarding";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Props {
  templates: EmailTemplate[];
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CATEGORIES = ["system", "billing", "notification", "marketing", "onboarding"] as const;

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  system:       { bg: "rgba(59,130,246,0.12)", color: "#3b82f6" },
  billing:      { bg: "rgba(34,197,94,0.12)",  color: "#22c55e" },
  notification: { bg: "rgba(245,158,11,0.12)", color: "#f59e0b" },
  marketing:    { bg: "rgba(168,85,247,0.12)", color: "#a855f7" },
  onboarding:   { bg: "rgba(20,184,166,0.12)", color: "#14b8a6" },
};

/** Sample values used when previewing templates */
const SAMPLE_VALUES: Record<string, string> = {
  company_name: "Acme Construction",
  user_name: "John Smith",
  user_email: "john@acme.com",
  project_name: "Downtown Tower",
  invoice_number: "INV-2024-001",
  amount: "$12,500.00",
  due_date: "March 15, 2026",
  reset_link: "https://app.buildwrk.com/reset?token=abc123",
  login_link: "https://app.buildwrk.com/login",
  plan_name: "Professional",
  trial_days: "14",
  support_email: "support@buildwrk.com",
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string): string {
  return formatDateSafe(dateStr);
}

function formatName(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function replaceVariables(html: string, variables: string[]): string {
  let result = html;
  for (const v of variables) {
    const regex = new RegExp(`\\{\\{\\s*${v}\\s*\\}\\}`, "g");
    result = result.replace(regex, SAMPLE_VALUES[v] || `[${v}]`);
  }
  return result;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function EmailTemplatesClient({ templates }: Props) {
  const router = useRouter();
  const t = useTranslations("superAdmin");

  /* ---- UI state ---- */
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* ---- Edit / Create modal state ---- */
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  /* ---- Preview modal state ---- */
  const [previewTemplate, setPreviewTemplate] = useState<{
    name: string;
    subject: string;
    body: string;
    variables: string[];
    category: string;
  } | null>(null);

  /* ---- Form fields ---- */
  const [formName, setFormName] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formVariables, setFormVariables] = useState<string[]>([]);
  const [formCategory, setFormCategory] = useState<string>("notification");
  const [formIsActive, setFormIsActive] = useState(true);
  const [newVariable, setNewVariable] = useState("");

  /* ---- Delete confirm ---- */
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* ---- Toggle loading ---- */
  const [togglingId, setTogglingId] = useState<string | null>(null);

  /* ---- KPI stats ---- */
  const totalCount = templates.length;
  const activeCount = templates.filter((t) => t.is_active).length;
  const categoryCount = useMemo(
    () => new Set(templates.map((t) => t.category)).size,
    [templates]
  );

  /* ================================================================ */
  /*  Modal helpers                                                    */
  /* ================================================================ */

  function openCreate() {
    setEditingTemplate(null);
    setIsCreating(true);
    setFormName("");
    setFormSubject("");
    setFormBody("");
    setFormVariables([]);
    setFormCategory("notification");
    setFormIsActive(true);
    setError("");
  }

  function openEdit(t: EmailTemplate) {
    setIsCreating(false);
    setEditingTemplate(t);
    setFormName(t.name);
    setFormSubject(t.subject);
    setFormBody(t.body);
    setFormVariables([...(t.variables || [])]);
    setFormCategory(t.category);
    setFormIsActive(t.is_active);
    setError("");
  }

  function closeModal() {
    setEditingTemplate(null);
    setIsCreating(false);
    setError("");
  }

  function openPreview(t: EmailTemplate) {
    setPreviewTemplate({
      name: t.name,
      subject: t.subject,
      body: t.body,
      variables: [...(t.variables || [])],
      category: t.category,
    });
  }

  function openPreviewFromEditor() {
    setPreviewTemplate({
      name: formName,
      subject: formSubject,
      body: formBody,
      variables: [...formVariables],
      category: formCategory,
    });
  }

  function addVariable() {
    const v = newVariable.trim().toLowerCase().replace(/\s+/g, "_");
    if (v && !formVariables.includes(v)) {
      setFormVariables([...formVariables, v]);
    }
    setNewVariable("");
  }

  function removeVariable(v: string) {
    setFormVariables(formVariables.filter((x) => x !== v));
  }

  /* ================================================================ */
  /*  CRUD handlers                                                    */
  /* ================================================================ */

  async function handleSave() {
    if (!formName.trim() || !formSubject.trim() || !formBody.trim()) {
      setError("Name, subject, and body are required.");
      return;
    }
    setSaving(true);
    setError("");

    try {
      if (isCreating) {
        const res = await fetch("/api/super-admin/email-templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName,
            subject: formSubject,
            body: formBody,
            variables: formVariables,
            category: formCategory,
            is_active: formIsActive,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Failed to create template.");
          return;
        }

        setSuccess("Template created successfully.");
      } else if (editingTemplate) {
        const res = await fetch(`/api/super-admin/email-templates/${editingTemplate.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName,
            subject: formSubject,
            body: formBody,
            variables: formVariables,
            category: formCategory,
            is_active: formIsActive,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Failed to update template.");
          return;
        }

        setSuccess("Template updated successfully.");
      }

      closeModal();
      router.refresh();
    } catch {
      setError("A network error occurred.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    setError("");

    try {
      const res = await fetch(`/api/super-admin/email-templates/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to delete template.");
        return;
      }

      setSuccess("Template deleted successfully.");
      setDeleteId(null);
      router.refresh();
    } catch {
      setError("A network error occurred.");
    } finally {
      setDeleting(false);
    }
  }

  async function toggleActive(id: string, currentActive: boolean) {
    setTogglingId(id);
    setError("");

    try {
      const res = await fetch(`/api/super-admin/email-templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentActive }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to update template.");
        return;
      }

      router.refresh();
    } catch {
      setError("A network error occurred.");
    } finally {
      setTogglingId(null);
    }
  }

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  const isModalOpen = isCreating || editingTemplate !== null;

  return (
    <>
      {/* ---- Header ---- */}
      <div className="admin-header">
        <div>
          <h2>{t("emailTemplates.title")}</h2>
          <p className="admin-header-sub">
            {t("emailTemplates.subtitle")}
          </p>
        </div>
        <div className="admin-header-actions">
          <button className="sa-action-btn primary" onClick={openCreate}>
            <Plus size={14} /> {t("emailTemplates.newTemplate")}
          </button>
        </div>
      </div>

      {/* ---- KPI Cards ---- */}
      <div className="admin-stats" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="admin-stat-card">
          <div className="admin-stat-icon blue">
            <Mail size={18} />
          </div>
          <div className="admin-stat-label">{t("emailTemplates.totalTemplates")}</div>
          <div className="admin-stat-value">{totalCount}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon green">
            <Check size={18} />
          </div>
          <div className="admin-stat-label">{t("emailTemplates.activeTemplates")}</div>
          <div className="admin-stat-value">{activeCount}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ background: "rgba(168,85,247,0.1)", color: "#a855f7" }}>
            <FileText size={18} />
          </div>
          <div className="admin-stat-label">{t("emailTemplates.categories")}</div>
          <div className="admin-stat-value">{categoryCount}</div>
        </div>
      </div>

      {/* ---- Messages ---- */}
      {error && <div className="invite-error">{error}</div>}
      {success && <div className="invite-success">{success}</div>}

      {/* ---- Template Table ---- */}
      <div className="sa-table-wrap">
        <table className="sa-table">
          <thead>
            <tr>
              <th>{t("emailTemplates.thName")}</th>
              <th>{t("emailTemplates.thSubject")}</th>
              <th>{t("emailTemplates.thCategory")}</th>
              <th>{t("emailTemplates.thStatus")}</th>
              <th>{t("emailTemplates.thUpdated")}</th>
              <th>{t("emailTemplates.thActions")}</th>
            </tr>
          </thead>
          <tbody>
            {templates.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
                  {t("emailTemplates.noTemplatesYet")}
                </td>
              </tr>
            ) : (
              templates.map((t) => {
                const catColor = CATEGORY_COLORS[t.category] || CATEGORY_COLORS.notification;
                return (
                  <tr
                    key={t.id}
                    style={{ opacity: togglingId === t.id ? 0.5 : 1, cursor: "pointer" }}
                    onClick={() => openEdit(t)}
                  >
                    <td>
                      <div style={{ fontWeight: 500 }}>{formatName(t.name)}</div>
                    </td>
                    <td>
                      <div style={{
                        fontSize: "0.85rem",
                        color: "var(--muted)",
                        maxWidth: "280px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}>
                        {t.subject}
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 10px",
                          borderRadius: "12px",
                          fontSize: "0.75rem",
                          fontWeight: 500,
                          textTransform: "capitalize",
                          background: catColor.bg,
                          color: catColor.color,
                        }}
                      >
                        {t.category}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => toggleActive(t.id, t.is_active)}
                        disabled={togglingId === t.id}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "3px 10px",
                          borderRadius: "12px",
                          fontSize: "0.75rem",
                          fontWeight: 500,
                          border: "none",
                          cursor: "pointer",
                          background: t.is_active ? "rgba(34,197,94,0.12)" : "var(--surface, #f3f4f6)",
                          color: t.is_active ? "#22c55e" : "var(--muted)",
                        }}
                      >
                        {t.is_active ? <><Check size={12} /> Active</> : "Inactive"}
                      </button>
                    </td>
                    <td style={{ color: "var(--muted)", fontSize: "0.8rem" }} suppressHydrationWarning>
                      {formatDate(t.updated_at || t.created_at)}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          className="sa-action-btn"
                          onClick={() => openPreview(t)}
                          style={{ fontSize: "0.78rem", padding: "4px 10px" }}
                          title="Preview email"
                        >
                          <Eye size={12} /> Preview
                        </button>
                        <button
                          className="sa-action-btn"
                          onClick={() => openEdit(t)}
                          style={{ fontSize: "0.78rem", padding: "4px 10px" }}
                        >
                          <Code size={12} /> Edit
                        </button>
                        <button
                          className="sa-action-btn danger"
                          onClick={() => setDeleteId(t.id)}
                          style={{ fontSize: "0.78rem", padding: "4px 10px" }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ---- Delete Confirmation Modal ---- */}
      {deleteId && (
        <div className="ticket-modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="ticket-modal-header">
              <h3>Delete Template</h3>
              <button className="ticket-modal-close" onClick={() => setDeleteId(null)}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: "1.2rem" }}>
              <p style={{ marginBottom: 16 }}>
                Are you sure you want to delete this email template? This action cannot be undone.
              </p>
              <div className="ticket-form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setDeleteId(null)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ backgroundColor: "var(--color-red, #ef4444)" }}
                  onClick={() => handleDelete(deleteId)}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Delete Template"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---- Edit / Create Modal ---- */}
      {isModalOpen && (
        <div className="ticket-modal-overlay" onClick={closeModal}>
          <div
            className="ticket-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 720, maxHeight: "92vh", overflow: "hidden", display: "flex", flexDirection: "column" }}
          >
            <div className="ticket-modal-header">
              <h3>{isCreating ? "New Email Template" : `Edit: ${formatName(editingTemplate?.name || "")}`}</h3>
              <button className="ticket-modal-close" onClick={closeModal}>
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="invite-error" style={{ margin: "12px 1.2rem 0" }}>{error}</div>
            )}

            <div style={{ padding: "1.2rem", overflow: "auto", flex: 1 }}>
              {/* Name */}
              <div className="ticket-form-group">
                <label className="ticket-form-label">Template Name *</label>
                <input
                  type="text"
                  className="ticket-form-input"
                  placeholder="e.g. Welcome Email"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              {/* Subject */}
              <div className="ticket-form-group">
                <label className="ticket-form-label">Subject Line *</label>
                <input
                  type="text"
                  className="ticket-form-input"
                  placeholder="e.g. Welcome to {{company_name}}"
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                />
              </div>

              {/* Category & Active row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Category</label>
                  <select
                    className="ticket-form-input"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    style={{ height: "38px" }}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Status</label>
                  <select
                    className="ticket-form-input"
                    value={formIsActive ? "active" : "inactive"}
                    onChange={(e) => setFormIsActive(e.target.value === "active")}
                    style={{ height: "38px" }}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Variables */}
              <div className="ticket-form-group">
                <label className="ticket-form-label">Variables</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
                  {formVariables.map((v) => (
                    <span
                      key={v}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "3px 10px",
                        borderRadius: "12px",
                        fontSize: "0.78rem",
                        background: "rgba(59,130,246,0.1)",
                        color: "#3b82f6",
                        fontFamily: "monospace",
                      }}
                    >
                      {"{{" + v + "}}"}
                      <button
                        onClick={() => removeVariable(v)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 0,
                          color: "#3b82f6",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <input
                    type="text"
                    className="ticket-form-input"
                    placeholder="Add variable name (e.g. user_name)"
                    value={newVariable}
                    onChange={(e) => setNewVariable(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addVariable();
                      }
                    }}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="sa-action-btn"
                    onClick={addVariable}
                    style={{ padding: "6px 12px", whiteSpace: "nowrap" }}
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="ticket-form-group">
                <label className="ticket-form-label">HTML Body *</label>
                <textarea
                  className="ticket-form-input"
                  placeholder="<html>&#10;  <body>&#10;    <h1>Hello {{user_name}}</h1>&#10;  </body>&#10;</html>"
                  value={formBody}
                  onChange={(e) => setFormBody(e.target.value)}
                  rows={14}
                  style={{
                    resize: "vertical",
                    fontFamily: "'SF Mono', 'Fira Code', 'Fira Mono', Menlo, Consolas, monospace",
                    fontSize: "0.82rem",
                    lineHeight: "1.5",
                    whiteSpace: "pre",
                    minHeight: "200px",
                  }}
                />
              </div>

              {/* Actions */}
              <div className="ticket-form-actions" style={{ marginTop: 16 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="sa-action-btn"
                  onClick={openPreviewFromEditor}
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  <Eye size={14} /> Preview
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : isCreating
                    ? "Create Template"
                    : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---- Preview Modal ---- */}
      {previewTemplate && (
        <div
          className="ticket-modal-overlay"
          style={{ zIndex: 1100 }}
          onClick={() => setPreviewTemplate(null)}
        >
          <div
            className="ticket-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 780, maxHeight: "92vh", overflow: "hidden", display: "flex", flexDirection: "column" }}
          >
            <div className="ticket-modal-header">
              <h3>Preview: {formatName(previewTemplate.name)}</h3>
              <button className="ticket-modal-close" onClick={() => setPreviewTemplate(null)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "1.2rem", overflow: "auto", flex: 1 }}>
              {/* Email client chrome */}
              <div style={{
                background: "#e8eaed",
                borderRadius: 10,
                overflow: "hidden",
                boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
              }}>
                {/* Window chrome bar */}
                <div style={{
                  padding: "14px 20px",
                  background: "#f8f9fa",
                  borderBottom: "1px solid #dee2e6",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", color: "#333" }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: "3px 0", fontWeight: 600, width: 60, verticalAlign: "top", color: "#666" }}>From:</td>
                        <td style={{ padding: "3px 0" }}>Buildwrk &lt;noreply@buildwrk.com&gt;</td>
                      </tr>
                      <tr>
                        <td style={{ padding: "3px 0", fontWeight: 600, color: "#666" }}>To:</td>
                        <td style={{ padding: "3px 0" }}>John Smith &lt;john@acme.com&gt;</td>
                      </tr>
                      <tr>
                        <td style={{ padding: "3px 0", fontWeight: 600, color: "#666" }}>Subject:</td>
                        <td style={{ padding: "3px 0", fontWeight: 600 }}>
                          {replaceVariables(previewTemplate.subject, previewTemplate.variables)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Email body */}
                <div style={{
                  background: "#ffffff",
                  padding: "32px 24px",
                  minHeight: 300,
                }}>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: replaceVariables(previewTemplate.body, previewTemplate.variables),
                    }}
                    style={{
                      maxWidth: 600,
                      margin: "0 auto",
                      color: "#333333",
                      fontSize: "15px",
                      lineHeight: "1.7",
                      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                    }}
                  />
                </div>

                {/* Email footer */}
                <div style={{
                  padding: "16px 24px",
                  background: "#f8f9fa",
                  borderTop: "1px solid #dee2e6",
                  textAlign: "center",
                  fontSize: "0.72rem",
                  color: "#999",
                }}>
                  Buildwrk Construction &amp; Property Management &middot; info@donkeyideas.com
                </div>
              </div>

              {/* Variables used hint */}
              {previewTemplate.variables.length > 0 && (
                <div style={{
                  marginTop: 16,
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "rgba(59,130,246,0.06)",
                  border: "1px solid rgba(59,130,246,0.15)",
                  fontSize: "0.78rem",
                  color: "var(--muted)",
                }}>
                  <strong style={{ color: "var(--text)" }}>Sample values used:</strong>{" "}
                  {previewTemplate.variables.map((v) => (
                    <span key={v} style={{ marginRight: 10 }}>
                      <code style={{ color: "#3b82f6" }}>{"{{" + v + "}}"}</code>
                      {" = "}
                      {SAMPLE_VALUES[v] || `[${v}]`}
                    </span>
                  ))}
                </div>
              )}

              {/* Close button */}
              <div style={{ marginTop: 16, textAlign: "right" }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setPreviewTemplate(null)}
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
