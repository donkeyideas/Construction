"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tag, Plus, X, Pencil, Trash2, Copy, RefreshCw } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { formatDateSafe } from "@/lib/utils/format";

interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  duration_days: number;
  max_uses: number | null;
  current_uses: number;
  plan_granted: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  created_by: string | null;
}

interface Props {
  promoCodes: PromoCode[];
}

function formatDate(dateStr: string, loc: string): string {
  return formatDateSafe(dateStr);
}

function generateCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function planBadgeColor(plan: string): string {
  switch (plan) {
    case "enterprise":
      return "sa-badge-purple";
    case "professional":
      return "sa-badge-blue";
    case "starter":
      return "sa-badge-green";
    default:
      return "";
  }
}

export default function PromoCodesClient({ promoCodes }: Props) {
  const router = useRouter();
  const t = useTranslations("superAdmin");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Create form state
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [durationDays, setDurationDays] = useState<number>(30);
  const [maxUses, setMaxUses] = useState<string>("");
  const [planGranted, setPlanGranted] = useState("professional");
  const [expiresAt, setExpiresAt] = useState("");

  // Detail modal state
  const [selectedPromo, setSelectedPromo] = useState<PromoCode | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, string | boolean | number | null>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // KPI calculations
  const now = new Date();
  const activeCount = promoCodes.filter((p) => p.is_active).length;
  const totalRedemptions = promoCodes.reduce((sum, p) => sum + p.current_uses, 0);
  const mostUsed = promoCodes.length > 0
    ? promoCodes.reduce((max, p) => (p.current_uses > max.current_uses ? p : max), promoCodes[0])
    : null;

  function openDetail(p: PromoCode) {
    setSelectedPromo(p);
    setIsEditing(false);
    setEditData({});
    setSaveError("");
    setShowDeleteConfirm(false);
  }

  function closeDetail() {
    setSelectedPromo(null);
    setIsEditing(false);
    setEditData({});
    setSaveError("");
    setShowDeleteConfirm(false);
  }

  function startEditing() {
    if (!selectedPromo) return;
    setEditData({
      code: selectedPromo.code,
      description: selectedPromo.description || "",
      duration_days: selectedPromo.duration_days,
      max_uses: selectedPromo.max_uses ?? "",
      plan_granted: selectedPromo.plan_granted,
      is_active: selectedPromo.is_active,
      expires_at: selectedPromo.expires_at
        ? selectedPromo.expires_at.slice(0, 10)
        : "",
    });
    setIsEditing(true);
    setSaveError("");
    setShowDeleteConfirm(false);
  }

  function resetCreateForm() {
    setCode("");
    setDescription("");
    setDurationDays(30);
    setMaxUses("");
    setPlanGranted("professional");
    setExpiresAt("");
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setSuccess(`Copied "${text}" to clipboard.`);
    setTimeout(() => setSuccess(""), 2000);
  }

  async function handleSave() {
    if (!selectedPromo) return;
    setSaving(true);
    setSaveError("");

    try {
      const payload: Record<string, unknown> = {};
      if (editData.code && editData.code !== selectedPromo.code) payload.code = editData.code;
      if (editData.description !== (selectedPromo.description || ""))
        payload.description = editData.description || null;
      if (editData.duration_days !== selectedPromo.duration_days)
        payload.duration_days = editData.duration_days;
      if (editData.plan_granted !== selectedPromo.plan_granted)
        payload.plan_granted = editData.plan_granted;
      if (editData.is_active !== selectedPromo.is_active)
        payload.is_active = editData.is_active;

      // Handle max_uses: empty string = null (unlimited), number = limit
      const newMaxUses = editData.max_uses === "" || editData.max_uses === null
        ? null
        : Number(editData.max_uses);
      if (newMaxUses !== selectedPromo.max_uses) payload.max_uses = newMaxUses;

      // Handle expires_at: empty string = null
      const newExpiresAt = editData.expires_at || null;
      const oldExpiresAt = selectedPromo.expires_at
        ? selectedPromo.expires_at.slice(0, 10)
        : null;
      if (newExpiresAt !== oldExpiresAt) payload.expires_at = newExpiresAt;

      if (Object.keys(payload).length === 0) {
        setIsEditing(false);
        closeDetail();
        return;
      }

      const res = await fetch(`/api/super-admin/promo-codes/${selectedPromo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setSaveError(data.error || "Failed to save changes.");
        return;
      }

      setIsEditing(false);
      closeDetail();
      router.refresh();
    } catch {
      setSaveError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedPromo) return;
    setSaving(true);
    setSaveError("");

    try {
      const res = await fetch(`/api/super-admin/promo-codes/${selectedPromo.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        setSaveError(data.error || "Failed to delete promo code.");
        return;
      }

      closeDetail();
      setSuccess("Promo code deleted.");
      router.refresh();
    } catch {
      setSaveError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !durationDays || !planGranted) return;

    setCreating(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/super-admin/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.toUpperCase().trim(),
          description: description || null,
          duration_days: durationDays,
          max_uses: maxUses ? Number(maxUses) : null,
          plan_granted: planGranted,
          expires_at: expiresAt || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create promo code.");
        return;
      }

      setSuccess("Promo code created successfully.");
      resetCreateForm();
      setShowCreate(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(id: string, currentActive: boolean) {
    setToggling(id);
    setError("");

    try {
      const res = await fetch(`/api/super-admin/promo-codes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentActive }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to update promo code.");
        return;
      }

      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setToggling(null);
    }
  }

  return (
    <>
      <div className="admin-header">
        <div>
          <h2>{t("promoCodes")}</h2>
          <p className="admin-header-sub">
            {t("managePromoCodes")}
          </p>
        </div>
        <div className="admin-header-actions">
          <button
            className="sa-action-btn primary"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={14} /> {t("newPromoCode")}
          </button>
        </div>
      </div>

      <div className="admin-stats" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className="admin-stat-card">
          <div className="admin-stat-icon blue">
            <Tag size={18} />
          </div>
          <div className="admin-stat-label">{t("totalCodes")}</div>
          <div className="admin-stat-value">{promoCodes.length}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon green">
            <Tag size={18} />
          </div>
          <div className="admin-stat-label">{t("activeCodes")}</div>
          <div className="admin-stat-value">{activeCount}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ background: "rgba(139,92,246,0.1)", color: "var(--color-purple, #8b5cf6)" }}>
            <RefreshCw size={18} />
          </div>
          <div className="admin-stat-label">{t("totalRedemptions")}</div>
          <div className="admin-stat-value">{totalRedemptions}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ background: "rgba(245,158,11,0.1)", color: "var(--color-amber, #f59e0b)" }}>
            <Tag size={18} />
          </div>
          <div className="admin-stat-label">{t("mostUsedCode")}</div>
          <div className="admin-stat-value" style={{ fontSize: "0.95rem" }}>
            {mostUsed ? mostUsed.code : "---"}
          </div>
        </div>
      </div>

      {error && <div className="invite-error">{error}</div>}
      {success && <div className="invite-success">{success}</div>}

      <div className="sa-table-wrap">
        <table className="sa-table">
          <thead>
            <tr>
              <th>{t("code")}</th>
              <th>{t("description")}</th>
              <th>{t("plan")}</th>
              <th>{t("duration")}</th>
              <th>{t("uses")}</th>
              <th>{t("status")}</th>
              <th>{t("created")}</th>
              <th>{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {promoCodes.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
                  {t("noPromoCodesYet")}
                </td>
              </tr>
            ) : (
              promoCodes.map((p) => {
                const isExpired = p.expires_at && new Date(p.expires_at) < now;
                const isMaxedOut = p.max_uses !== null && p.current_uses >= p.max_uses;

                return (
                  <tr
                    key={p.id}
                    style={{ opacity: toggling === p.id ? 0.5 : 1, cursor: "pointer" }}
                    onClick={() => openDetail(p)}
                  >
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <code style={{ fontWeight: 600, fontSize: "0.85rem", letterSpacing: "0.05em" }}>
                          {p.code}
                        </code>
                        <button
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 2 }}
                          onClick={(e) => { e.stopPropagation(); copyToClipboard(p.code); }}
                          title="Copy code"
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: "0.82rem", color: "var(--muted)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.description || "---"}
                      </div>
                    </td>
                    <td>
                      <span className={`sa-badge ${planBadgeColor(p.plan_granted)}`} style={{ textTransform: "capitalize" }}>
                        {p.plan_granted}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.82rem" }}>
                      {p.duration_days} days
                    </td>
                    <td style={{ fontSize: "0.82rem" }}>
                      {p.current_uses}/{p.max_uses ?? "\u221E"}
                    </td>
                    <td>
                      {!p.is_active ? (
                        <span className="sa-badge" style={{ background: "var(--surface)", color: "var(--muted)" }}>
                          {t("inactive")}
                        </span>
                      ) : isExpired ? (
                        <span className="sa-badge" style={{ background: "rgba(239,68,68,0.1)", color: "var(--color-red, #ef4444)" }}>
                          Expired
                        </span>
                      ) : isMaxedOut ? (
                        <span className="sa-badge" style={{ background: "rgba(245,158,11,0.1)", color: "var(--color-amber, #f59e0b)" }}>
                          Maxed Out
                        </span>
                      ) : (
                        <span className="sa-badge sa-badge-green">{t("active")}</span>
                      )}
                    </td>
                    <td style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                      {formatDate(p.created_at, dateLocale)}
                    </td>
                    <td>
                      <button
                        className={`sa-action-btn ${p.is_active ? "danger" : ""}`}
                        onClick={(e) => { e.stopPropagation(); toggleActive(p.id, p.is_active); }}
                        disabled={toggling === p.id}
                        style={{ fontSize: "0.78rem", padding: "4px 10px" }}
                      >
                        {p.is_active ? t("deactivate") : t("activate")}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="ticket-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>{t("newPromoCode")}</h3>
              <button className="ticket-modal-close" onClick={() => setShowCreate(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="ticket-form">
              <div style={{ padding: "1.2rem" }}>
                <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>
                  {t("promoCodeNote")}
                </p>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("codeRequired")}</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="text"
                      className="ticket-form-input"
                      placeholder="e.g. LAUNCH2025"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      required
                      style={{ flex: 1, fontFamily: "monospace", letterSpacing: "0.05em" }}
                    />
                    <button
                      type="button"
                      className="sa-action-btn"
                      onClick={() => setCode(generateCode())}
                      title="Auto-generate code"
                      style={{ whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <RefreshCw size={13} /> Generate
                    </button>
                  </div>
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("description")}</label>
                  <input
                    type="text"
                    className="ticket-form-input"
                    placeholder="Optional description for internal reference"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="ticket-form-row">
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("durationDays")} *</label>
                    <input
                      type="number"
                      className="ticket-form-input"
                      placeholder="30"
                      value={durationDays}
                      onChange={(e) => setDurationDays(Number(e.target.value))}
                      required
                      min={1}
                    />
                  </div>
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("maxUses")}</label>
                    <input
                      type="number"
                      className="ticket-form-input"
                      placeholder="Unlimited"
                      value={maxUses}
                      onChange={(e) => setMaxUses(e.target.value)}
                      min={1}
                    />
                  </div>
                </div>

                <div className="ticket-form-row">
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("planGranted")} *</label>
                    <select
                      className="ticket-form-select"
                      value={planGranted}
                      onChange={(e) => setPlanGranted(e.target.value)}
                    >
                      <option value="starter">Starter</option>
                      <option value="professional">Professional</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("expiresAt")}</label>
                    <input
                      type="date"
                      className="ticket-form-input"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="ticket-form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>
                  {t("cancel")}
                </button>
                <button type="submit" className="btn-primary" disabled={creating}>
                  {creating ? t("creating") : t("createPromoCode")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail / Edit Modal */}
      {selectedPromo && (
        <div className="ticket-modal-overlay" onClick={closeDetail}>
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            {/* Modal Header */}
            <div className="ticket-modal-header">
              <h3>
                <code style={{ letterSpacing: "0.05em" }}>{selectedPromo.code}</code>
                {!isEditing && (
                  <span
                    className={selectedPromo.is_active ? "sa-badge sa-badge-green" : "sa-badge"}
                    style={{
                      marginLeft: 10,
                      fontSize: "0.78rem",
                      ...(!selectedPromo.is_active ? { background: "var(--surface)", color: "var(--muted)" } : {}),
                    }}
                  >
                    {selectedPromo.is_active ? t("active") : t("inactive")}
                  </span>
                )}
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {!isEditing && !showDeleteConfirm && (
                  <>
                    <button
                      className="ticket-modal-close"
                      onClick={(e) => { e.stopPropagation(); copyToClipboard(selectedPromo.code); }}
                      title="Copy code"
                    >
                      <Copy size={16} />
                    </button>
                    <button className="ticket-modal-close" onClick={startEditing} title={t("edit")}>
                      <Pencil size={16} />
                    </button>
                    <button
                      className="ticket-modal-close"
                      onClick={() => setShowDeleteConfirm(true)}
                      title="Delete promo code"
                      style={{ color: "var(--color-red)" }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
                <button className="ticket-modal-close" onClick={closeDetail}>
                  <X size={18} />
                </button>
              </div>
            </div>

            {saveError && (
              <div className="ticket-form-error">{saveError}</div>
            )}

            {/* ---- Delete Confirmation ---- */}
            {showDeleteConfirm && (
              <div style={{ padding: "1.2rem" }}>
                <p style={{ marginBottom: 16, fontWeight: 500 }}>
                  Are you sure you want to delete promo code &quot;{selectedPromo.code}&quot;? This action cannot be undone.
                </p>
                <div className="ticket-form-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowDeleteConfirm(false)} disabled={saving}>
                    {t("cancel")}
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ backgroundColor: "var(--color-red)" }}
                    onClick={handleDelete}
                    disabled={saving}
                  >
                    {saving ? t("deleting") : "Delete Promo Code"}
                  </button>
                </div>
              </div>
            )}

            {/* ---- Edit Mode ---- */}
            {isEditing && !showDeleteConfirm && (
              <div style={{ padding: "1.2rem" }}>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("code")}</label>
                  <input
                    type="text"
                    className="ticket-form-input"
                    value={(editData.code as string) ?? ""}
                    onChange={(e) => setEditData({ ...editData, code: e.target.value.toUpperCase() })}
                    style={{ fontFamily: "monospace", letterSpacing: "0.05em" }}
                  />
                </div>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("description")}</label>
                  <input
                    type="text"
                    className="ticket-form-input"
                    value={(editData.description as string) ?? ""}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  />
                </div>
                <div className="ticket-form-row">
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("durationDays")}</label>
                    <input
                      type="number"
                      className="ticket-form-input"
                      value={(editData.duration_days as number) ?? 30}
                      onChange={(e) => setEditData({ ...editData, duration_days: Number(e.target.value) })}
                      min={1}
                    />
                  </div>
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("maxUses")}</label>
                    <input
                      type="number"
                      className="ticket-form-input"
                      placeholder="Unlimited"
                      value={(editData.max_uses as string | number) ?? ""}
                      onChange={(e) => setEditData({ ...editData, max_uses: e.target.value === "" ? "" : Number(e.target.value) })}
                      min={1}
                    />
                  </div>
                </div>
                <div className="ticket-form-row">
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("planGranted")}</label>
                    <select
                      className="ticket-form-select"
                      value={(editData.plan_granted as string) ?? "professional"}
                      onChange={(e) => setEditData({ ...editData, plan_granted: e.target.value })}
                    >
                      <option value="starter">Starter</option>
                      <option value="professional">Professional</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("active")}</label>
                    <select
                      className="ticket-form-select"
                      value={editData.is_active ? "true" : "false"}
                      onChange={(e) => setEditData({ ...editData, is_active: e.target.value === "true" })}
                    >
                      <option value="true">{t("active")}</option>
                      <option value="false">{t("inactive")}</option>
                    </select>
                  </div>
                </div>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("expiresAt")}</label>
                  <input
                    type="date"
                    className="ticket-form-input"
                    value={(editData.expires_at as string) ?? ""}
                    onChange={(e) => setEditData({ ...editData, expires_at: e.target.value })}
                  />
                </div>
                <div className="ticket-form-actions">
                  <button type="button" className="btn-secondary" onClick={() => setIsEditing(false)} disabled={saving}>
                    {t("cancel")}
                  </button>
                  <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? t("saving") : t("saveChanges")}
                  </button>
                </div>
              </div>
            )}

            {/* ---- View Mode ---- */}
            {!isEditing && !showDeleteConfirm && (
              <div style={{ padding: "1.25rem" }}>
                <div className="detail-group" style={{ marginBottom: 4 }}>
                  <label className="detail-label">{t("code")}</label>
                  <div className="detail-value">
                    <code style={{ letterSpacing: "0.05em", fontWeight: 600 }}>{selectedPromo.code}</code>
                  </div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">{t("description")}</label>
                  <div className="detail-value">{selectedPromo.description || "---"}</div>
                </div>
                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">{t("planGranted")}</label>
                    <div className="detail-value">
                      <span className={`sa-badge ${planBadgeColor(selectedPromo.plan_granted)}`} style={{ textTransform: "capitalize" }}>
                        {selectedPromo.plan_granted}
                      </span>
                    </div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">{t("durationDays")}</label>
                    <div className="detail-value">{selectedPromo.duration_days} days</div>
                  </div>
                </div>
                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">{t("uses")}</label>
                    <div className="detail-value">
                      {selectedPromo.current_uses} / {selectedPromo.max_uses ?? "\u221E"}
                    </div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">{t("status")}</label>
                    <div className="detail-value">
                      {selectedPromo.is_active ? (
                        <span className="sa-badge sa-badge-green">{t("active")}</span>
                      ) : (
                        <span className="sa-badge" style={{ background: "var(--surface)", color: "var(--muted)" }}>
                          {t("inactive")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">{t("created")}</label>
                    <div className="detail-value" style={{ borderBottom: "none" }}>
                      {formatDate(selectedPromo.created_at, dateLocale)}
                    </div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">{t("expiresAt")}</label>
                    <div className="detail-value" style={{ borderBottom: "none" }}>
                      {selectedPromo.expires_at ? formatDate(selectedPromo.expires_at, dateLocale) : "Never"}
                    </div>
                  </div>
                </div>

                <div className="ticket-form-actions">
                  <button type="button" className="btn-secondary" onClick={closeDetail}>
                    {t("close")}
                  </button>
                  <button type="button" className="btn-primary" onClick={startEditing}>
                    <Pencil size={14} /> {t("edit")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
