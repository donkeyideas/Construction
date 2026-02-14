"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

const IMPORT_COLUMNS: ImportColumn[] = [
  { key: "entry_date", label: "Date", required: true, type: "date" },
  { key: "hours", label: "Hours", required: true, type: "number" },
  { key: "overtime_hours", label: "Overtime Hours", required: false, type: "number" },
  { key: "description", label: "Description", required: false },
  { key: "cost_code", label: "Cost Code", required: false },
];

const IMPORT_SAMPLE: Record<string, string>[] = [
  { entry_date: "2026-01-15", hours: "8", overtime_hours: "2", description: "Foundation work", cost_code: "03-100" },
];

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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

interface TimeClientProps {
  users: UserGroup[];
  entries: TimeEntry[];
  pendingCount: number;
  weekDates: string[]; // ISO date strings
  weekStartISO: string;
  weekEndISO: string;
  prevWeekISO: string;
  nextWeekISO: string;
  userRole: string;
}

function formatDateShort(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function TimeClient({
  users,
  entries,
  pendingCount,
  weekDates,
  weekStartISO,
  weekEndISO,
  prevWeekISO,
  nextWeekISO,
  userRole,
}: TimeClientProps) {
  const router = useRouter();

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
        throw new Error(data.error || "Failed to create time entry");
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
      setCreateError(err instanceof Error ? err.message : "Failed to create time entry");
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
    if (!res.ok) throw new Error(data.error || "Import failed");
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
        alert(data.error || "Failed to approve entries");
        return;
      }
      router.refresh();
    } catch {
      alert("Failed to approve entries");
    } finally {
      setApproving(false);
    }
  }

  // Detail modal handlers
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
        throw new Error(data.error || "Failed to update time entry");
      }

      closeModal();
      router.refresh();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : "Failed to update time entry");
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
        throw new Error(data.error || "Failed to delete time entry");
      }

      closeModal();
      router.refresh();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : "Failed to delete time entry");
    } finally {
      setIsDeleting(false);
    }
  }

  const isEmpty = entries.length === 0;
  const weekYear = new Date(weekEndISO + "T00:00:00").getFullYear();

  return (
    <div>
      {/* Header */}
      <div className="people-header">
        <div>
          <h2>Time & Attendance</h2>
          <p className="people-header-sub">
            Track team hours and approve timesheets.
          </p>
        </div>
        <div className="people-header-actions">
          <Link href="/people" className="ui-btn ui-btn-md ui-btn-secondary">
            People Directory
          </Link>
          <button className="btn-secondary" onClick={() => setShowImport(true)}>
            <Upload size={16} />
            Import CSV
          </button>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            New Time Entry
          </button>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="week-nav">
        <Link href={`/people/time?week=${prevWeekISO}`} className="week-nav-btn">
          <ChevronLeft size={18} />
        </Link>
        <Link href={`/people/time?week=${nextWeekISO}`} className="week-nav-btn">
          <ChevronRight size={18} />
        </Link>
        <span className="week-nav-label">
          Week of {formatDateShort(weekStartISO)}
        </span>
        <span className="week-nav-dates">
          {formatDateShort(weekStartISO)} - {formatDateShort(weekEndISO)}, {weekYear}
        </span>
      </div>

      {/* Actions Bar */}
      {pendingCount > 0 && (
        <div className="timesheet-actions">
          <div className="timesheet-actions-info">
            <strong>{pendingCount}</strong> time{" "}
            {pendingCount !== 1 ? "entries" : "entry"} pending approval
          </div>
          {isAdmin && (
            <button
              className="ui-btn ui-btn-sm ui-btn-primary"
              onClick={handleApproveAll}
              disabled={approving}
            >
              <CheckCircle2 size={14} />
              {approving ? "Approving..." : "Approve All"}
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
          <div className="people-empty-title">No time entries this week</div>
          <p className="people-empty-desc">
            No team members have logged hours for the week of{" "}
            {formatDateShort(weekStartISO)}. Time entries will appear here as they
            are submitted.
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="timesheet-grid">
              <thead>
                <tr>
                  <th>Team Member</th>
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
                  <th className="total-col">Total</th>
                  <th>Status</th>
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
                      <td>
                        <span className={`time-status time-status-${overallStatus}`}>
                          {overallStatus === "pending"
                            ? "Pending"
                            : overallStatus === "approved"
                              ? "Approved"
                              : "Rejected"}
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

      {/* ── Create Time Entry Modal ── */}
      {showCreate && (
        <div className="ticket-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>New Time Entry</h3>
              <button className="ticket-modal-close" onClick={() => setShowCreate(false)}>
                <X size={18} />
              </button>
            </div>

            {createError && <div className="ticket-form-error">{createError}</div>}

            <form onSubmit={handleCreate} className="ticket-form">
              <div className="ticket-form-group">
                <label className="ticket-form-label">Project</label>
                <select
                  className="ticket-form-select"
                  value={formData.project_id}
                  onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                >
                  <option value="">
                    {loadingProjects ? "Loading projects..." : "Select a project..."}
                  </option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code ? `${p.code} - ` : ""}{p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">Entry Date *</label>
                <input
                  type="date"
                  className="ticket-form-input"
                  value={formData.entry_date}
                  onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                  required
                />
              </div>

              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Hours *</label>
                  <input
                    type="number"
                    className="ticket-form-input"
                    value={formData.hours}
                    onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                    placeholder="8.0"
                    min={0}
                    max={24}
                    step="0.5"
                    required
                  />
                </div>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Overtime Hours</label>
                  <input
                    type="number"
                    className="ticket-form-input"
                    value={formData.overtime_hours}
                    onChange={(e) => setFormData({ ...formData, overtime_hours: e.target.value })}
                    placeholder="0"
                    min={0}
                    max={24}
                    step="0.5"
                  />
                </div>
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">Description</label>
                <input
                  type="text"
                  className="ticket-form-input"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What work was performed?"
                />
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">Cost Code</label>
                <input
                  type="text"
                  className="ticket-form-input"
                  value={formData.cost_code}
                  onChange={(e) => setFormData({ ...formData, cost_code: e.target.value })}
                  placeholder="e.g., 03-100"
                />
              </div>

              <div className="ticket-form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={creating || !formData.hours || !formData.entry_date}
                >
                  {creating ? "Creating..." : "Create Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Import Modal ── */}
      {showImport && (
        <ImportModal
          entityName="Time Entries"
          columns={IMPORT_COLUMNS}
          sampleData={IMPORT_SAMPLE}
          onImport={handleImport}
          onClose={() => { setShowImport(false); router.refresh(); }}
        />
      )}

      {/* ── Team Member Detail Modal ── */}
      {selectedUser && !selectedEntry && !isEditing && (
        <div className="ticket-modal-overlay" onClick={closeModal}>
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>Time Entries</h3>
              <button className="ticket-modal-close" onClick={closeModal}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "20px" }}>
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
                    hours this week
                  </span>
                </div>
                <div className="people-detail-row">
                  <FileText size={16} />
                  <span>
                    <strong>{selectedUser.entries.length}</strong>{" "}
                    {selectedUser.entries.length === 1 ? "entry" : "entries"}
                  </span>
                </div>
              </div>

              {/* Entries list */}
              <div className="people-detail-notes" style={{ marginTop: 0 }}>
                <label>Entries</label>
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
                        style={{ padding: "12px 16px" }}
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
                              {entry.status === "pending" ? "Pending" : entry.status === "approved" ? "Approved" : "Rejected"}
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

      {/* ── Single Entry Detail / Edit Modal ── */}
      {selectedEntry && !isEditing && !showDeleteConfirm && (
        <div className="ticket-modal-overlay" onClick={closeModal}>
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>Time Entry Details</h3>
              <button className="ticket-modal-close" onClick={closeModal}>
                <X size={18} />
              </button>
            </div>

            {modalError && <div className="ticket-form-error">{modalError}</div>}

            <div style={{ padding: "20px" }}>
              <div className="people-detail-section">
                <div className="people-detail-row">
                  <Calendar size={16} />
                  <span>
                    {new Date(selectedEntry.entry_date + "T00:00:00").toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="people-detail-row">
                  <Clock size={16} />
                  <span><strong>{Number(selectedEntry.hours || 0).toFixed(1)}</strong> hours</span>
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
                    {selectedEntry.status === "pending" ? "Pending" : selectedEntry.status === "approved" ? "Approved" : "Rejected"}
                  </span>
                </div>
              </div>

              {selectedEntry.notes && (
                <div className="people-detail-notes">
                  <label>Notes</label>
                  <p>{selectedEntry.notes}</p>
                </div>
              )}
            </div>

            {isAdmin && (
              <div className="ticket-form-actions">
                <button className="btn-danger-outline" onClick={() => setShowDeleteConfirm(true)}>
                  <Trash2 size={16} />
                  Delete
                </button>
                <button className="btn-primary" onClick={() => startEdit(selectedEntry)}>
                  <Edit3 size={16} />
                  Edit
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Edit Entry Modal ── */}
      {selectedEntry && isEditing && !showDeleteConfirm && (
        <div className="ticket-modal-overlay" onClick={closeModal}>
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>Edit Time Entry</h3>
              <button className="ticket-modal-close" onClick={closeModal}>
                <X size={18} />
              </button>
            </div>

            {modalError && <div className="ticket-form-error">{modalError}</div>}

            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="ticket-form">
              <div className="ticket-form-group">
                <label className="ticket-form-label">Entry Date *</label>
                <input
                  type="date"
                  className="ticket-form-input"
                  value={editFormData.entry_date}
                  onChange={(e) => setEditFormData({ ...editFormData, entry_date: e.target.value })}
                  required
                />
              </div>

              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Hours *</label>
                  <input
                    type="number"
                    className="ticket-form-input"
                    value={editFormData.hours}
                    onChange={(e) => setEditFormData({ ...editFormData, hours: e.target.value })}
                    placeholder="8.0"
                    min={0}
                    max={24}
                    step="0.5"
                    required
                  />
                </div>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Status</label>
                  <select
                    className="ticket-form-select"
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">Cost Code</label>
                <input
                  type="text"
                  className="ticket-form-input"
                  value={editFormData.cost_code}
                  onChange={(e) => setEditFormData({ ...editFormData, cost_code: e.target.value })}
                  placeholder="e.g., 03-100"
                />
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">Notes</label>
                <input
                  type="text"
                  className="ticket-form-input"
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  placeholder="What work was performed?"
                />
              </div>

              <div className="ticket-form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => { setIsEditing(false); setSelectedEntry(selectedEntry); }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSaving || !editFormData.hours || !editFormData.entry_date}
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ── */}
      {selectedEntry && showDeleteConfirm && (
        <div className="ticket-modal-overlay" onClick={closeModal}>
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>Delete Time Entry</h3>
              <button className="ticket-modal-close" onClick={closeModal}>
                <X size={18} />
              </button>
            </div>

            {modalError && <div className="ticket-form-error">{modalError}</div>}

            <div className="ticket-delete-confirm">
              <p>Are you sure you want to delete this time entry?</p>
              <p style={{ fontSize: "0.875rem", color: "var(--muted)", marginTop: "0.5rem" }}>
                <strong>{Number(selectedEntry.hours || 0).toFixed(1)} hours</strong> on{" "}
                <strong>
                  {new Date(selectedEntry.entry_date + "T00:00:00").toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </strong>
              </p>
              <div className="ticket-delete-actions">
                <button
                  className="btn-secondary"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  className="btn-danger"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete Entry"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
