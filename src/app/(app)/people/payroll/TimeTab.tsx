"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import {
  Plus,
  X,
  Upload,
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Calendar,
  Briefcase,
  FileText,
  Hash,
  Edit3,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ImportModal from "@/components/ImportModal";
import type { ImportColumn } from "@/lib/utils/csv-parser";
import type { TimeEntry } from "@/lib/queries/people";

const IMPORT_SAMPLE: Record<string, string>[] = [
  { entry_date: "2026-01-15", hours: "8", overtime_hours: "2", description: "Foundation work", cost_code: "03-100" },
  { entry_date: "2026-01-16", hours: "8", overtime_hours: "0", description: "Framing - 2nd floor", cost_code: "06-100" },
  { entry_date: "2026-01-17", hours: "6", overtime_hours: "0", description: "Electrical rough-in", cost_code: "26-050" },
];

interface ProjectOption {
  id: string;
  name: string;
  code: string | null;
}

interface UserGroup {
  userId: string;
  name: string;
  email: string;
  entries: TimeEntry[];
}

interface TimeTabProps {
  view: "weekly" | "all";
  users: UserGroup[];
  entries: TimeEntry[];
  allEntries: TimeEntry[];
  pendingCount: number;
  weekDates: string[];
  weekStartISO: string;
  weekEndISO: string;
  prevWeekISO: string;
  nextWeekISO: string;
  userRole: string;
  rateMap: Record<string, number>;
}

function fmtCost(hours: number, rate: number | undefined): string {
  if (!rate) return "--";
  const cost = hours * rate;
  return cost > 0
    ? `$${cost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "--";
}

export default function TimeTab({
  view,
  users,
  entries,
  allEntries,
  pendingCount,
  weekDates,
  weekStartISO,
  weekEndISO,
  prevWeekISO,
  nextWeekISO,
  userRole,
  rateMap,
}: TimeTabProps) {
  const router = useRouter();
  const t = useTranslations("people");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  const DAY_LABELS = [t("dayMon"), t("dayTue"), t("dayWed"), t("dayThu"), t("dayFri"), t("daySat"), t("daySun")];

  const IMPORT_COLUMNS: ImportColumn[] = [
    { key: "entry_date", label: t("date"), required: true, type: "date" },
    { key: "hours", label: t("hours"), required: true, type: "number" },
    { key: "overtime_hours", label: t("overtimeHours"), required: false, type: "number" },
    { key: "description", label: t("description"), required: false },
    { key: "cost_code", label: t("costCode"), required: false },
  ];

  function formatDateShort(iso: string): string {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString(dateLocale, { month: "short", day: "numeric" });
  }

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const [approving, setApproving] = useState(false);
  const isAdmin = ["owner", "admin"].includes(userRole);

  const today = new Date().toISOString().slice(0, 10);

  const [formData, setFormData] = useState({
    project_id: "",
    entry_date: today,
    hours: "",
    overtime_hours: "0",
    description: "",
    cost_code: "",
  });

  // Detail modal state
  const [selectedUser, setSelectedUser] = useState<UserGroup | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<TimeEntry | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [modalError, setModalError] = useState("");
  const [editFormData, setEditFormData] = useState({
    entry_date: "",
    hours: "",
    cost_code: "",
    notes: "",
    status: "pending" as string,
  });

  // Fetch projects when create modal opens
  useEffect(() => {
    if (!showCreate) return;
    setLoadingProjects(true);
    const supabase = createClient();
    supabase
      .from("projects")
      .select("id, name, code")
      .order("name", { ascending: true })
      .then(({ data }) => {
        setProjects(
          (data ?? []).map((p: Record<string, unknown>) => ({
            id: p.id as string,
            name: p.name as string,
            code: (p.code as string) || null,
          }))
        );
        setLoadingProjects(false);
      });
  }, [showCreate]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");

    try {
      const res = await fetch("/api/people/time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: formData.project_id || undefined,
          entry_date: formData.entry_date,
          hours: Number(formData.hours),
          overtime_hours: Number(formData.overtime_hours || 0),
          description: formData.description || undefined,
          cost_code: formData.cost_code || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToCreateTimeEntry"));
      }

      setFormData({
        project_id: "",
        entry_date: today,
        hours: "",
        overtime_hours: "0",
        description: "",
        cost_code: "",
      });
      setShowCreate(false);
      router.refresh();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : t("failedToCreateTimeEntry"));
    } finally {
      setCreating(false);
    }
  }

  async function handleImport(rows: Record<string, string>[]) {
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "time_entries", rows }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || t("importFailed"));
    router.refresh();
    return { success: data.success, errors: data.errors };
  }

  async function handleApproveAll() {
    if (!isAdmin || approving) return;
    const pendingIds = entries.filter((e) => e.status === "pending").map((e) => e.id);
    if (pendingIds.length === 0) return;

    setApproving(true);
    try {
      const res = await fetch("/api/people/time/approve-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryIds: pendingIds }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || t("failedToApproveEntries"));
        return;
      }
      router.refresh();
    } catch {
      alert(t("failedToApproveEntries"));
    } finally {
      setApproving(false);
    }
  }

  function handleRowClick(user: UserGroup) {
    setSelectedUser(user);
    setSelectedEntry(null);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setModalError("");
  }

  function handleEntryClick(entry: TimeEntry) {
    setSelectedEntry(entry);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setModalError("");
  }

  function closeModal() {
    setSelectedUser(null);
    setSelectedEntry(null);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setModalError("");
  }

  function startEdit(entry: TimeEntry) {
    setSelectedEntry(entry);
    setEditFormData({
      entry_date: entry.entry_date,
      hours: String(entry.hours ?? ""),
      cost_code: entry.cost_code || "",
      notes: entry.notes || "",
      status: entry.status,
    });
    setIsEditing(true);
    setShowDeleteConfirm(false);
    setModalError("");
  }

  async function handleSave() {
    if (!selectedEntry) return;
    setIsSaving(true);
    setModalError("");

    try {
      const res = await fetch(`/api/people/time/${selectedEntry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entry_date: editFormData.entry_date,
          hours: Number(editFormData.hours),
          cost_code: editFormData.cost_code || null,
          notes: editFormData.notes || null,
          status: editFormData.status,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToUpdateTimeEntry"));
      }

      closeModal();
      router.refresh();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : t("failedToUpdateTimeEntry"));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedEntry) return;
    setIsDeleting(true);
    setModalError("");

    try {
      const res = await fetch(`/api/people/time/${selectedEntry.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToDeleteTimeEntry"));
      }

      closeModal();
      router.refresh();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : t("failedToDeleteTimeEntry"));
    } finally {
      setIsDeleting(false);
    }
  }

  const isEmpty = entries.length === 0;
  const weekYear = new Date(weekEndISO + "T00:00:00").getFullYear();

  return (
    <>
      {/* Actions toolbar */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 16 }}>
        <button className="ui-btn ui-btn-sm ui-btn-secondary" onClick={() => setShowImport(true)}>
          <Upload size={14} />
          Import CSV
        </button>
        <button className="ui-btn ui-btn-sm ui-btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={14} />
          New Time Entry
        </button>
      </div>

      {view === "weekly" ? (
        <>
          {/* Week Navigation */}
          <div className="week-nav">
            <Link href={`/people/payroll?tab=weekly&week=${prevWeekISO}`} className="week-nav-btn">
              <ChevronLeft size={18} />
            </Link>
            <Link href={`/people/payroll?tab=weekly&week=${nextWeekISO}`} className="week-nav-btn">
              <ChevronRight size={18} />
            </Link>
            <span className="week-nav-label">
              {t("weekOf", { date: formatDateShort(weekStartISO) })}
            </span>
            <span className="week-nav-dates">
              {formatDateShort(weekStartISO)} - {formatDateShort(weekEndISO)}, {weekYear}
            </span>
          </div>

          {/* Actions Bar */}
          {pendingCount > 0 && (
            <div className="timesheet-actions">
              <div className="timesheet-actions-info">
                {t("pendingApproval", { count: pendingCount })}
              </div>
              {isAdmin && (
                <button
                  className="ui-btn ui-btn-sm ui-btn-primary"
                  onClick={handleApproveAll}
                  disabled={approving}
                >
                  <CheckCircle2 size={14} />
                  {approving ? t("approving") : t("approveAll")}
                </button>
              )}
            </div>
          )}

          {/* Timesheet Grid */}
          {isEmpty ? (
            <div className="people-empty">
              <div className="people-empty-icon">
                <Clock size={48} />
              </div>
              <div className="people-empty-title">{t("noTimeEntriesThisWeek")}</div>
              <p className="people-empty-desc">
                {t("noTimeEntriesDescription", { date: formatDateShort(weekStartISO) })}
              </p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table className="timesheet-grid">
                  <thead>
                    <tr>
                      <th>{t("teamMember")}</th>
                      {weekDates.map((dateStr, i) => {
                        const d = new Date(dateStr + "T00:00:00");
                        return (
                          <th key={i}>
                            {DAY_LABELS[i]}
                            <br />
                            <span style={{ fontSize: "0.68rem", fontWeight: 400, color: "var(--muted)" }}>
                              {d.getMonth() + 1}/{d.getDate()}
                            </span>
                          </th>
                        );
                      })}
                      <th className="total-col">{t("total")}</th>
                      <th className="total-col">Cost</th>
                      <th>{t("status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => {
                      const dailyHours = weekDates.map((dateStr) => {
                        const dayEntries = user.entries.filter((e) => e.entry_date === dateStr);
                        return dayEntries.reduce((sum, e) => sum + (Number(e.hours) || 0), 0);
                      });

                      const totalHours = dailyHours.reduce((a, b) => a + b, 0);

                      const statuses = user.entries.map((e) => e.status);
                      const overallStatus = statuses.includes("rejected")
                        ? "rejected"
                        : statuses.includes("pending")
                          ? "pending"
                          : "approved";

                      const initials = user.name
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase();

                      return (
                        <tr
                          key={user.userId}
                          onClick={() => handleRowClick(user)}
                          style={{ cursor: "pointer" }}
                        >
                          <td>
                            <div className="timesheet-person">
                              <div className="timesheet-person-avatar">{initials}</div>
                              <div className="timesheet-person-info">
                                <div className="timesheet-person-name">{user.name}</div>
                              </div>
                            </div>
                          </td>
                          {dailyHours.map((hours, i) => (
                            <td key={i}>
                              <div className={`timesheet-cell ${hours > 0 ? "has-hours" : "no-hours"}`}>
                                {hours > 0 ? hours.toFixed(1) : "--"}
                              </div>
                            </td>
                          ))}
                          <td className="total-col">
                            {totalHours > 0 ? totalHours.toFixed(1) : "--"}
                          </td>
                          <td className="total-col" style={{ color: "var(--success, #16a34a)", fontWeight: 600 }}>
                            {fmtCost(totalHours, rateMap[user.userId])}
                          </td>
                          <td>
                            <span className={`time-status time-status-${overallStatus}`}>
                              {overallStatus === "pending"
                                ? t("statusPending")
                                : overallStatus === "approved"
                                  ? t("statusApproved")
                                  : t("statusRejected")}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        /* ── All Entries Table View ── */
        <>
          <div className="timesheet-actions" style={{ marginBottom: 16 }}>
            <div className="timesheet-actions-info">
              {t("showingEntries", { count: allEntries.length })} &mdash;{" "}
              <strong>
                {allEntries.reduce((sum, e) => sum + (Number(e.hours) || 0), 0).toFixed(1)}
              </strong>{" "}
              {t("totalHours")}
              {(() => {
                const totalCost = allEntries.reduce((sum, e) => {
                  const h = Number(e.hours) || 0;
                  const r = rateMap[e.user_id];
                  return r ? sum + h * r : sum;
                }, 0);
                return totalCost > 0 ? (
                  <>
                    {" "}&mdash;{" "}
                    <strong style={{ color: "var(--success, #16a34a)" }}>
                      ${totalCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>{" "}
                    total cost
                  </>
                ) : null;
              })()}
            </div>
          </div>

          {allEntries.length === 0 ? (
            <div className="people-empty">
              <div className="people-empty-icon">
                <Clock size={48} />
              </div>
              <div className="people-empty-title">{t("noTimeEntries")}</div>
              <p className="people-empty-desc">{t("noTimeEntriesAllDescription")}</p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table className="timesheet-grid">
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left" }}>{t("date")}</th>
                      <th style={{ textAlign: "left" }}>{t("employee")}</th>
                      <th style={{ textAlign: "left" }}>{t("project")}</th>
                      <th>{t("hours")}</th>
                      <th>Cost</th>
                      <th>{t("costCode")}</th>
                      <th style={{ textAlign: "left", minWidth: 200 }}>{t("description")}</th>
                      <th>{t("status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allEntries.map((entry) => {
                      const userName =
                        entry.user_profile?.full_name ||
                        entry.user_profile?.email ||
                        "Unknown";
                      const initials = userName
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase();

                      return (
                        <tr
                          key={entry.id}
                          onClick={() => handleEntryClick(entry)}
                          style={{ cursor: "pointer" }}
                        >
                          <td style={{ textAlign: "left", whiteSpace: "nowrap" }}>
                            {new Date(entry.entry_date + "T00:00:00").toLocaleDateString(dateLocale, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </td>
                          <td style={{ textAlign: "left" }}>
                            <div className="timesheet-person">
                              <div className="timesheet-person-avatar">{initials}</div>
                              <div className="timesheet-person-name">{userName}</div>
                            </div>
                          </td>
                          <td style={{ textAlign: "left", fontSize: "0.82rem" }}>
                            {entry.project?.name || "--"}
                          </td>
                          <td>
                            <div className="timesheet-cell has-hours">
                              {Number(entry.hours || 0).toFixed(1)}
                            </div>
                          </td>
                          <td style={{ color: "var(--success, #16a34a)", fontWeight: 600 }}>
                            {fmtCost(Number(entry.hours || 0), rateMap[entry.user_id])}
                          </td>
                          <td style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "0.8rem" }}>
                            {entry.cost_code || "--"}
                          </td>
                          <td style={{ textAlign: "left", fontSize: "0.82rem", color: "var(--muted)", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {entry.notes || "--"}
                          </td>
                          <td>
                            <span className={`time-status time-status-${entry.status}`}>
                              {entry.status === "pending"
                                ? t("statusPending")
                                : entry.status === "approved"
                                  ? t("statusApproved")
                                  : t("statusRejected")}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Create Time Entry Modal ── */}
      {showCreate && (
        <div className="fin-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="fin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fin-modal-header">
              <h3>{t("newTimeEntry")}</h3>
              <button
                className="ui-btn ui-btn-sm ui-btn-ghost"
                onClick={() => setShowCreate(false)}
              >
                <X size={18} />
              </button>
            </div>

            {createError && (
              <div style={{ color: "var(--color-red)", padding: "0 24px", fontSize: "0.88rem" }}>
                {createError}
              </div>
            )}

            <div className="fin-modal-body">
              <form onSubmit={handleCreate}>
                <div className="payroll-form-group" style={{ marginBottom: 16 }}>
                  <label className="payroll-form-label">{t("project")}</label>
                  <select
                    className="payroll-form-input"
                    value={formData.project_id}
                    onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                  >
                    <option value="">
                      {loadingProjects ? t("loadingProjects") : t("selectProject")}
                    </option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code ? `${p.code} - ` : ""}{p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="payroll-form-group" style={{ marginBottom: 16 }}>
                  <label className="payroll-form-label">{t("entryDateRequired")}</label>
                  <input
                    type="date"
                    className="payroll-form-input"
                    value={formData.entry_date}
                    onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                    required
                  />
                </div>

                <div className="payroll-form-grid" style={{ marginBottom: 16 }}>
                  <div className="payroll-form-group">
                    <label className="payroll-form-label">{t("hoursRequired")}</label>
                    <input
                      type="number"
                      className="payroll-form-input"
                      value={formData.hours}
                      onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                      placeholder="8.0"
                      min={0}
                      max={24}
                      step="0.5"
                      required
                    />
                  </div>
                  <div className="payroll-form-group">
                    <label className="payroll-form-label">{t("overtimeHours")}</label>
                    <input
                      type="number"
                      className="payroll-form-input"
                      value={formData.overtime_hours}
                      onChange={(e) => setFormData({ ...formData, overtime_hours: e.target.value })}
                      placeholder="0"
                      min={0}
                      max={24}
                      step="0.5"
                    />
                  </div>
                </div>

                <div className="payroll-form-group" style={{ marginBottom: 16 }}>
                  <label className="payroll-form-label">{t("description")}</label>
                  <input
                    type="text"
                    className="payroll-form-input"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={t("descriptionPlaceholder")}
                  />
                </div>

                <div className="payroll-form-group" style={{ marginBottom: 16 }}>
                  <label className="payroll-form-label">{t("costCode")}</label>
                  <input
                    type="text"
                    className="payroll-form-input"
                    value={formData.cost_code}
                    onChange={(e) => setFormData({ ...formData, cost_code: e.target.value })}
                    placeholder={t("costCodePlaceholder")}
                  />
                </div>

                <div className="fin-modal-footer" style={{ padding: 0 }}>
                  <button
                    type="button"
                    className="ui-btn ui-btn-md ui-btn-outline"
                    onClick={() => setShowCreate(false)}
                  >
                    {t("cancel")}
                  </button>
                  <button
                    type="submit"
                    className="ui-btn ui-btn-md ui-btn-primary"
                    disabled={creating || !formData.hours || !formData.entry_date}
                  >
                    {creating ? t("creating") : t("createEntry")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Import Modal ── */}
      {showImport && (
        <ImportModal
          entityName={t("timeEntriesEntity")}
          columns={IMPORT_COLUMNS}
          sampleData={IMPORT_SAMPLE}
          onImport={handleImport}
          onClose={() => { setShowImport(false); router.refresh(); }}
        />
      )}

      {/* ── Team Member Detail Modal ── */}
      {selectedUser && !selectedEntry && !isEditing && (
        <div className="fin-modal-overlay" onClick={closeModal}>
          <div className="fin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fin-modal-header">
              <h3>{t("timeEntries")}</h3>
              <button className="ui-btn ui-btn-sm ui-btn-ghost" onClick={closeModal}>
                <X size={18} />
              </button>
            </div>

            <div className="fin-modal-body">
              {/* Person header */}
              <div className="people-detail-header">
                <div className="people-detail-avatar">
                  {selectedUser.name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <div className="people-detail-name">{selectedUser.name}</div>
                  {selectedUser.email && (
                    <div className="people-detail-title">{selectedUser.email}</div>
                  )}
                </div>
              </div>

              {/* Weekly summary */}
              <div className="people-detail-section" style={{ marginBottom: 16 }}>
                <div className="people-detail-row">
                  <Clock size={16} />
                  <span>
                    <strong>
                      {selectedUser.entries
                        .reduce((sum, e) => sum + (Number(e.hours) || 0), 0)
                        .toFixed(1)}
                    </strong>{" "}
                    {t("hoursThisWeek")}
                  </span>
                </div>
                <div className="people-detail-row">
                  <FileText size={16} />
                  <span>
                    <strong>{selectedUser.entries.length}</strong>{" "}
                    {selectedUser.entries.length === 1 ? t("entry") : t("entries")}
                  </span>
                </div>
              </div>

              {/* Entries list */}
              <div className="people-detail-notes" style={{ marginTop: 0 }}>
                <label>{t("entries")}</label>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                {selectedUser.entries
                  .sort((a, b) => a.entry_date.localeCompare(b.entry_date))
                  .map((entry) => {
                    const d = new Date(entry.entry_date + "T00:00:00");
                    const dayLabel = DAY_LABELS[((d.getDay() + 6) % 7)];
                    return (
                      <div
                        key={entry.id}
                        className="contact-card"
                        style={{ padding: "12px 16px", cursor: "pointer" }}
                        onClick={() => handleEntryClick(entry)}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                              <Calendar size={14} style={{ color: "var(--muted)" }} />
                              <span style={{ fontWeight: 600, fontSize: "0.88rem" }}>
                                {dayLabel}, {formatDateShort(entry.entry_date)}
                              </span>
                            </div>
                            {entry.notes && (
                              <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginLeft: 22 }}>
                                {entry.notes}
                              </div>
                            )}
                            {entry.project?.name && (
                              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.78rem", color: "var(--muted)", marginLeft: 22, marginTop: 2 }}>
                                <Briefcase size={12} />
                                {entry.project.name}
                              </div>
                            )}
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: "1rem", fontFamily: "var(--font-serif)" }}>
                              {Number(entry.hours || 0).toFixed(1)}h
                            </div>
                            <span className={`time-status time-status-${entry.status}`}>
                              {entry.status === "pending" ? t("statusPending") : entry.status === "approved" ? t("statusApproved") : t("statusRejected")}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Single Entry Detail Modal ── */}
      {selectedEntry && !isEditing && !showDeleteConfirm && (
        <div className="fin-modal-overlay" onClick={closeModal}>
          <div className="fin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fin-modal-header">
              <h3>{t("timeEntryDetails")}</h3>
              <button className="ui-btn ui-btn-sm ui-btn-ghost" onClick={closeModal}>
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div style={{ color: "var(--color-red)", padding: "0 24px", fontSize: "0.88rem" }}>
                {modalError}
              </div>
            )}

            <div className="fin-modal-body">
              <div className="people-detail-section">
                <div className="people-detail-row">
                  <Calendar size={16} />
                  <span>
                    {new Date(selectedEntry.entry_date + "T00:00:00").toLocaleDateString(dateLocale, {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="people-detail-row">
                  <Clock size={16} />
                  <span><strong>{Number(selectedEntry.hours || 0).toFixed(1)}</strong> {t("hours")}</span>
                </div>
                {selectedEntry.work_type && (
                  <div className="people-detail-row">
                    <Briefcase size={16} />
                    <span style={{ textTransform: "capitalize" }}>{selectedEntry.work_type}</span>
                  </div>
                )}
                {selectedEntry.cost_code && (
                  <div className="people-detail-row">
                    <Hash size={16} />
                    <span style={{ fontFamily: "var(--font-mono, monospace)" }}>{selectedEntry.cost_code}</span>
                  </div>
                )}
                {selectedEntry.project?.name && (
                  <div className="people-detail-row">
                    <Briefcase size={16} />
                    <span>{selectedEntry.project.name}</span>
                  </div>
                )}
                <div className="people-detail-row">
                  <CheckCircle2 size={16} />
                  <span className={`time-status time-status-${selectedEntry.status}`}>
                    {selectedEntry.status === "pending" ? t("statusPending") : selectedEntry.status === "approved" ? t("statusApproved") : t("statusRejected")}
                  </span>
                </div>
              </div>

              {selectedEntry.notes && (
                <div className="people-detail-notes">
                  <label>{t("notes")}</label>
                  <p>{selectedEntry.notes}</p>
                </div>
              )}
            </div>

            {isAdmin && (
              <div className="fin-modal-footer">
                <button className="ui-btn ui-btn-md ui-btn-outline" style={{ color: "var(--color-red)" }} onClick={() => setShowDeleteConfirm(true)}>
                  <Trash2 size={16} />
                  {t("delete")}
                </button>
                <button className="ui-btn ui-btn-md ui-btn-primary" onClick={() => startEdit(selectedEntry)}>
                  <Edit3 size={16} />
                  {t("edit")}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Edit Entry Modal ── */}
      {selectedEntry && isEditing && !showDeleteConfirm && (
        <div className="fin-modal-overlay" onClick={closeModal}>
          <div className="fin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fin-modal-header">
              <h3>{t("editTimeEntry")}</h3>
              <button className="ui-btn ui-btn-sm ui-btn-ghost" onClick={closeModal}>
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div style={{ color: "var(--color-red)", padding: "0 24px", fontSize: "0.88rem" }}>
                {modalError}
              </div>
            )}

            <div className="fin-modal-body">
              <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                <div className="payroll-form-group" style={{ marginBottom: 16 }}>
                  <label className="payroll-form-label">{t("entryDateRequired")}</label>
                  <input
                    type="date"
                    className="payroll-form-input"
                    value={editFormData.entry_date}
                    onChange={(e) => setEditFormData({ ...editFormData, entry_date: e.target.value })}
                    required
                  />
                </div>

                <div className="payroll-form-grid" style={{ marginBottom: 16 }}>
                  <div className="payroll-form-group">
                    <label className="payroll-form-label">{t("hoursRequired")}</label>
                    <input
                      type="number"
                      className="payroll-form-input"
                      value={editFormData.hours}
                      onChange={(e) => setEditFormData({ ...editFormData, hours: e.target.value })}
                      placeholder="8.0"
                      min={0}
                      max={24}
                      step="0.5"
                      required
                    />
                  </div>
                  <div className="payroll-form-group">
                    <label className="payroll-form-label">{t("status")}</label>
                    <select
                      className="payroll-form-input"
                      value={editFormData.status}
                      onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    >
                      <option value="pending">{t("statusPending")}</option>
                      <option value="approved">{t("statusApproved")}</option>
                      <option value="rejected">{t("statusRejected")}</option>
                    </select>
                  </div>
                </div>

                <div className="payroll-form-group" style={{ marginBottom: 16 }}>
                  <label className="payroll-form-label">{t("costCode")}</label>
                  <input
                    type="text"
                    className="payroll-form-input"
                    value={editFormData.cost_code}
                    onChange={(e) => setEditFormData({ ...editFormData, cost_code: e.target.value })}
                    placeholder={t("costCodePlaceholder")}
                  />
                </div>

                <div className="payroll-form-group" style={{ marginBottom: 16 }}>
                  <label className="payroll-form-label">{t("notes")}</label>
                  <input
                    type="text"
                    className="payroll-form-input"
                    value={editFormData.notes}
                    onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                    placeholder={t("descriptionPlaceholder")}
                  />
                </div>

                <div className="fin-modal-footer" style={{ padding: 0 }}>
                  <button
                    type="button"
                    className="ui-btn ui-btn-md ui-btn-outline"
                    onClick={() => { setIsEditing(false); setSelectedEntry(selectedEntry); }}
                  >
                    {t("cancel")}
                  </button>
                  <button
                    type="submit"
                    className="ui-btn ui-btn-md ui-btn-primary"
                    disabled={isSaving || !editFormData.hours || !editFormData.entry_date}
                  >
                    {isSaving ? t("saving") : t("saveChanges")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ── */}
      {selectedEntry && showDeleteConfirm && (
        <div className="fin-modal-overlay" onClick={closeModal}>
          <div className="fin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fin-modal-header">
              <h3>{t("deleteTimeEntry")}</h3>
              <button className="ui-btn ui-btn-sm ui-btn-ghost" onClick={closeModal}>
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div style={{ color: "var(--color-red)", padding: "0 24px", fontSize: "0.88rem" }}>
                {modalError}
              </div>
            )}

            <div className="fin-modal-body" style={{ textAlign: "center" }}>
              <p>{t("deleteTimeEntryConfirm")}</p>
              <p style={{ fontSize: "0.875rem", color: "var(--muted)", marginTop: "0.5rem" }}>
                <strong>{Number(selectedEntry.hours || 0).toFixed(1)} {t("hours")}</strong> {t("on")}{" "}
                <strong>
                  {new Date(selectedEntry.entry_date + "T00:00:00").toLocaleDateString(dateLocale, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </strong>
              </p>
            </div>
            <div className="fin-modal-footer">
              <button
                className="ui-btn ui-btn-md ui-btn-outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                {t("cancel")}
              </button>
              <button
                className="ui-btn ui-btn-md ui-btn-primary"
                style={{ background: "var(--color-red)" }}
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? t("deleting") : t("deleteEntry")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
