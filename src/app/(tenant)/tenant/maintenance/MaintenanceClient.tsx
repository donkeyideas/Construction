"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, Wrench, X, Pencil } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";

interface MaintenanceRequest {
  id: string;
  title: string | null;
  description: string | null;
  category: string | null;
  priority: string | null;
  status: string;
  created_at: string | null;
  updated_at: string | null;
}

const CATEGORIES = [
  { value: "plumbing", labelKey: "catPlumbing" },
  { value: "electrical", labelKey: "catElectrical" },
  { value: "hvac", labelKey: "catHvac" },
  { value: "appliance", labelKey: "catAppliance" },
  { value: "structural", labelKey: "catStructural" },
  { value: "general", labelKey: "catGeneral" },
];

const PRIORITIES = [
  { value: "low", labelKey: "priLow", descKey: "priLowDesc" },
  { value: "medium", labelKey: "priMedium", descKey: "priMediumDesc" },
  { value: "high", labelKey: "priHigh", descKey: "priHighDesc" },
  { value: "emergency", labelKey: "priEmergency", descKey: "priEmergencyDesc" },
];

function getStatusBadge(status: string): string {
  switch (status) {
    case "submitted":
      return "badge badge-blue";
    case "assigned":
    case "in_progress":
      return "badge badge-amber";
    case "completed":
    case "closed":
      return "badge badge-green";
    case "cancelled":
      return "badge badge-red";
    default:
      return "badge badge-blue";
  }
}

function getPriorityBadge(priority: string): string {
  switch (priority) {
    case "emergency":
    case "high":
      return "badge badge-red";
    case "medium":
      return "badge badge-amber";
    case "low":
      return "badge badge-green";
    default:
      return "badge badge-blue";
  }
}

function isEditable(status: string): boolean {
  return status === "submitted" || status === "assigned";
}

export default function MaintenanceClient({
  requests,
}: {
  requests: MaintenanceRequest[];
}) {
  const t = useTranslations("tenant");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  const router = useRouter();
  const [selected, setSelected] = useState<MaintenanceRequest | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("general");
  const [editPriority, setEditPriority] = useState("medium");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // New request modal state
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [newPriority, setNewPriority] = useState("medium");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  function getCategoryLabel(value: string | null): string {
    const found = CATEGORIES.find((c) => c.value === value);
    return found ? t(found.labelKey) : (value ?? t("catGeneral"));
  }

  function openModal(req: MaintenanceRequest) {
    setSelected(req);
    setEditing(false);
    setError("");
  }

  function closeModal() {
    setSelected(null);
    setEditing(false);
    setError("");
  }

  function openNewModal() {
    setNewTitle("");
    setNewDescription("");
    setNewCategory("general");
    setNewPriority("medium");
    setSubmitError("");
    setShowNewModal(true);
  }

  function closeNewModal() {
    setShowNewModal(false);
    setSubmitError("");
  }

  function startEdit() {
    if (!selected) return;
    setEditTitle(selected.title ?? "");
    setEditDescription(selected.description ?? "");
    setEditCategory(selected.category ?? "general");
    setEditPriority(selected.priority ?? "medium");
    setEditing(true);
    setError("");
  }

  async function handleSubmitNew(e: FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) {
      setSubmitError(t("titleRequiredError"));
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch("/api/tenant/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription,
          category: newCategory,
          priority: newPriority,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t("failedSubmitRequest"));
      }

      closeNewModal();
      router.refresh();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t("somethingWentWrong"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    if (!editTitle.trim()) {
      setError(t("titleRequired"));
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/tenant/maintenance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selected.id,
          title: editTitle,
          description: editDescription,
          category: editCategory,
          priority: editPriority,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || t("failedUpdate"));
      }

      closeModal();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("somethingWentWrong"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "2rem", fontWeight: 700, margin: 0 }}>
            {t("maintenanceTitle")}
          </h2>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: 2 }}>
            {t("maintenanceSubtitle")}
          </p>
        </div>
        <button
          className="ui-btn ui-btn-md ui-btn-primary"
          onClick={openNewModal}
        >
          <Plus size={16} />
          {t("submitRequest")}
        </button>
      </div>

      {requests.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {requests.map((request) => (
            <div
              key={request.id}
              className="card"
              style={{ padding: 20, cursor: "pointer" }}
              onClick={() => openModal(request)}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "0.95rem",
                      marginBottom: 6,
                    }}
                  >
                    {request.title ?? t("untitledRequest")}
                  </div>
                  {request.description && (
                    <div
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--muted)",
                        lineHeight: 1.5,
                        marginBottom: 8,
                      }}
                    >
                      {request.description.length > 150
                        ? request.description.substring(0, 150) + "..."
                        : request.description}
                    </div>
                  )}
                  <div
                    style={{
                      display: "flex",
                      gap: 16,
                      fontSize: "0.78rem",
                      color: "var(--muted)",
                    }}
                  >
                    <span>
                      {t("submittedDate", {
                        date: request.created_at
                          ? new Date(request.created_at).toLocaleDateString(
                              dateLocale,
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )
                          : "--",
                      })}
                    </span>
                    <span>{getCategoryLabel(request.category)}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {request.priority && (
                    <span className={getPriorityBadge(request.priority)}>
                      {request.priority}
                    </span>
                  )}
                  <span className={getStatusBadge(request.status)}>
                    {request.status?.replace("_", " ")}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ padding: 48, textAlign: "center" }}>
          <div style={{ color: "var(--muted)", marginBottom: 12 }}>
            <Wrench size={48} />
          </div>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.1rem", fontWeight: 600, marginBottom: 6 }}>
            {t("noMaintenanceRequests")}
          </div>
          <div style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
            {t("noMaintenanceDesc")}
          </div>
        </div>
      )}

      {/* Submit New Request Modal */}
      {showNewModal && (
        <div className="tenant-modal-overlay" onClick={closeNewModal}>
          <div className="tenant-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tenant-modal-header">
              <h3 style={{ margin: 0, fontSize: "1.05rem" }}>
                {t("submitMaintenanceTitle")}
              </h3>
              <button
                className="tenant-modal-close"
                onClick={closeNewModal}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: "0.85rem", color: "var(--muted)", margin: "0 0 16px 0" }}>
              {t("submitMaintenanceSubtitle")}
            </p>

            {submitError && (
              <div className="tenant-alert tenant-alert-error">{submitError}</div>
            )}

            <form onSubmit={handleSubmitNew}>
              <div className="tenant-field">
                <label className="tenant-label">{t("issueTitle")}</label>
                <input
                  type="text"
                  className="tenant-form-input"
                  placeholder={t("issuePlaceholder")}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="tenant-field">
                  <label className="tenant-label">{t("category")}</label>
                  <select
                    className="tenant-form-select"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    disabled={submitting}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {t(c.labelKey)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="tenant-field">
                  <label className="tenant-label">{t("priority")}</label>
                  <select
                    className="tenant-form-select"
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    disabled={submitting}
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {t(p.descKey)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="tenant-field">
                <label className="tenant-label">{t("description")}</label>
                <textarea
                  className="tenant-form-input"
                  placeholder={t("descriptionPlaceholder")}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={4}
                  style={{ resize: "vertical" }}
                  disabled={submitting}
                />
              </div>

              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
                <button
                  type="button"
                  className="ui-btn ui-btn-md ui-btn-outline"
                  onClick={closeNewModal}
                  disabled={submitting}
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="ui-btn ui-btn-md ui-btn-primary"
                  disabled={submitting}
                >
                  {submitting ? t("submitting") : t("submitRequestBtn")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail / Edit Modal */}
      {selected && (
        <div className="tenant-modal-overlay" onClick={closeModal}>
          <div
            className="tenant-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tenant-modal-header">
              <h3 style={{ margin: 0, fontSize: "1.05rem" }}>
                {editing ? t("editRequest") : t("requestDetails")}
              </h3>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {!editing && isEditable(selected.status) && (
                  <button
                    className="ui-btn ui-btn-sm ui-btn-outline"
                    onClick={startEdit}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Pencil size={13} />
                    {t("edit")}
                  </button>
                )}
                <button
                  className="tenant-modal-close"
                  onClick={closeModal}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {error && (
              <div className="tenant-alert tenant-alert-error">{error}</div>
            )}

            {editing ? (
              <form onSubmit={handleSave}>
                <div className="tenant-field">
                  <label className="tenant-label">{t("issueTitle")}</label>
                  <input
                    type="text"
                    className="tenant-form-input"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    required
                    disabled={saving}
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                  }}
                >
                  <div className="tenant-field">
                    <label className="tenant-label">{t("category")}</label>
                    <select
                      className="tenant-form-select"
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      disabled={saving}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {t(c.labelKey)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="tenant-field">
                    <label className="tenant-label">{t("priority")}</label>
                    <select
                      className="tenant-form-select"
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value)}
                      disabled={saving}
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p.value} value={p.value}>
                          {t(p.labelKey)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="tenant-field">
                  <label className="tenant-label">{t("description")}</label>
                  <textarea
                    className="tenant-form-input"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={5}
                    style={{ resize: "vertical" }}
                    disabled={saving}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    justifyContent: "flex-end",
                    marginTop: 8,
                  }}
                >
                  <button
                    type="button"
                    className="ui-btn ui-btn-md ui-btn-outline"
                    onClick={() => setEditing(false)}
                    disabled={saving}
                  >
                    {t("cancel")}
                  </button>
                  <button
                    type="submit"
                    className="ui-btn ui-btn-md ui-btn-primary"
                    disabled={saving}
                  >
                    {saving ? t("saving") : t("saveChanges")}
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <div className="tenant-detail-row">
                  <span className="tenant-detail-label">{t("title")}</span>
                  <span>{selected.title ?? t("untitled")}</span>
                </div>
                <div className="tenant-detail-row">
                  <span className="tenant-detail-label">{t("status")}</span>
                  <span className={getStatusBadge(selected.status)}>
                    {selected.status?.replace("_", " ")}
                  </span>
                </div>
                <div className="tenant-detail-row">
                  <span className="tenant-detail-label">{t("priority")}</span>
                  {selected.priority ? (
                    <span className={getPriorityBadge(selected.priority)}>
                      {selected.priority}
                    </span>
                  ) : (
                    <span style={{ color: "var(--muted)" }}>--</span>
                  )}
                </div>
                <div className="tenant-detail-row">
                  <span className="tenant-detail-label">{t("category")}</span>
                  <span>{getCategoryLabel(selected.category)}</span>
                </div>
                <div className="tenant-detail-row">
                  <span className="tenant-detail-label">{t("submitted")}</span>
                  <span>
                    {selected.created_at
                      ? new Date(selected.created_at).toLocaleDateString(
                          dateLocale,
                          {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          }
                        )
                      : "--"}
                  </span>
                </div>
                {selected.updated_at &&
                  selected.updated_at !== selected.created_at && (
                    <div className="tenant-detail-row">
                      <span className="tenant-detail-label">{t("lastUpdated")}</span>
                      <span>
                        {new Date(selected.updated_at).toLocaleDateString(
                          dateLocale,
                          {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          }
                        )}
                      </span>
                    </div>
                  )}

                <div style={{ marginTop: 16 }}>
                  <span className="tenant-detail-label">{t("description")}</span>
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: "0.88rem",
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {selected.description || (
                      <span
                        style={{
                          color: "var(--muted)",
                          fontStyle: "italic",
                        }}
                      >
                        {t("noDescription")}
                      </span>
                    )}
                  </div>
                </div>

                {!isEditable(selected.status) && (
                  <div
                    style={{
                      marginTop: 20,
                      padding: "10px 14px",
                      borderRadius: 8,
                      background: "rgba(100,100,100,0.08)",
                      fontSize: "0.82rem",
                      color: "var(--muted)",
                    }}
                  >
                    {t("requestClosed", { status: selected.status?.replace("_", " ") })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
