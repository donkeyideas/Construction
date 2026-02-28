"use client";

import { formatDateSafe, formatDateShort } from "@/lib/utils/format";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  Search,
  Plus,
  X,
  Ticket,
  AlertCircle,
  Clock,
  CheckCircle2,
  Archive,
  Edit3,
  Trash2,
} from "lucide-react";
import type {
  TicketRow,
  TicketStats,
  CompanyMember,
  TicketStatus,
  TicketPriority,
  TicketCategory,
} from "@/lib/queries/tickets";

// ---------------------------------------------------------------------------
// Constants (non-translatable keys kept outside)
// ---------------------------------------------------------------------------

const STATUS_KEYS: TicketStatus[] = ["open", "in_progress", "resolved", "closed"];
const PRIORITY_KEYS: TicketPriority[] = ["low", "medium", "high", "urgent"];

const CATEGORY_KEYS: TicketCategory[] = [
  "IT",
  "HR",
  "Operations",
  "Finance",
  "Safety",
  "Equipment",
  "General",
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface TicketListClientProps {
  tickets: TicketRow[];
  stats: TicketStats;
  members: CompanyMember[];
  userId: string;
  companyId: string;
}

export default function TicketListClient({
  tickets,
  stats,
  members,
  userId,
  companyId,
}: TicketListClientProps) {
  const router = useRouter();
  const t = useTranslations("app");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  // ---------------------------------------------------------------------------
  // Translated label maps (inside component so t() is available)
  // ---------------------------------------------------------------------------

  const STATUS_LABELS: Record<TicketStatus, string> = {
    open: t("ticketStatusOpen"),
    in_progress: t("ticketStatusInProgress"),
    resolved: t("ticketStatusResolved"),
    closed: t("ticketStatusClosed"),
  };

  const PRIORITY_LABELS: Record<TicketPriority, string> = {
    low: t("priorityLow"),
    medium: t("priorityMedium"),
    high: t("priorityHigh"),
    urgent: t("priorityUrgent"),
  };

  const CATEGORIES = useMemo(() => CATEGORY_KEYS.map((key) => ({
    value: key,
    label: t(`category_${key.toLowerCase()}`),
  })), [t]);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "--";
    return formatDateSafe(dateStr);
  }

  function formatDateShort(dateStr: string | null) {
    if (!dateStr) return "--";
    return formatDateShort(dateStr);
  }

  function getUserName(
    user: { id: string; full_name: string; email: string } | null | undefined
  ): string {
    if (!user) return t("unassigned");
    return user.full_name || user.email || t("unknown");
  }

  // Filters
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | "all">("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium" as TicketPriority,
    category: "",
    assigned_to: "",
    tags: "",
  });

  // Detail / Edit / Delete modal state
  const [selectedTicket, setSelectedTicket] = useState<TicketRow | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editData, setEditData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Filtered tickets
  const filtered = useMemo(() => {
    let result = tickets;

    if (statusFilter !== "all") {
      result = result.filter((tk) => tk.status === statusFilter);
    }

    if (priorityFilter !== "all") {
      result = result.filter((tk) => tk.priority === priorityFilter);
    }

    if (assigneeFilter !== "all") {
      if (assigneeFilter === "unassigned") {
        result = result.filter((tk) => !tk.assigned_to);
      } else {
        result = result.filter((tk) => tk.assigned_to === assigneeFilter);
      }
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(
        (tk) =>
          tk.title.toLowerCase().includes(term) ||
          tk.ticket_number.toLowerCase().includes(term) ||
          (tk.description && tk.description.toLowerCase().includes(term))
      );
    }

    return result;
  }, [tickets, statusFilter, priorityFilter, assigneeFilter, search]);

  // Create ticket handler
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");

    try {
      const tagsArray = formData.tags
        .split(",")
        .map((tg) => tg.trim())
        .filter(Boolean);

      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || undefined,
          priority: formData.priority,
          category: formData.category || undefined,
          assigned_to: formData.assigned_to || undefined,
          tags: tagsArray.length > 0 ? tagsArray : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToCreateTicket"));
      }

      // Reset form and close modal
      setFormData({
        title: "",
        description: "",
        priority: "medium",
        category: "",
        assigned_to: "",
        tags: "",
      });
      setShowCreate(false);
      router.refresh();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : t("failedToCreateTicket"));
    } finally {
      setCreating(false);
    }
  }

  // Open detail modal
  function openDetail(ticket: TicketRow) {
    setSelectedTicket(ticket);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setSaveError("");
    setEditData({});
  }

  // Close detail modal
  function closeDetail() {
    setSelectedTicket(null);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setSaveError("");
    setEditData({});
  }

  // Enter edit mode
  function startEditing() {
    if (!selectedTicket) return;
    setEditData({
      title: selectedTicket.title,
      description: selectedTicket.description || "",
      status: selectedTicket.status,
      priority: selectedTicket.priority,
      category: selectedTicket.category || "",
      assigned_to: selectedTicket.assigned_to || "",
    });
    setIsEditing(true);
    setSaveError("");
  }

  // Cancel edit mode
  function cancelEditing() {
    setIsEditing(false);
    setEditData({});
    setSaveError("");
  }

  // Save edits via PATCH
  async function handleSave() {
    if (!selectedTicket) return;
    setSaving(true);
    setSaveError("");

    try {
      // Build payload with only changed fields
      const payload: Record<string, unknown> = {};
      if (editData.title !== selectedTicket.title) payload.title = editData.title;
      if (editData.description !== (selectedTicket.description || ""))
        payload.description = editData.description;
      if (editData.status !== selectedTicket.status) payload.status = editData.status;
      if (editData.priority !== selectedTicket.priority)
        payload.priority = editData.priority;
      if (editData.category !== (selectedTicket.category || ""))
        payload.category = editData.category || null;
      if (editData.assigned_to !== (selectedTicket.assigned_to || ""))
        payload.assigned_to = editData.assigned_to || null;

      if (Object.keys(payload).length === 0) {
        // Nothing changed
        setIsEditing(false);
        return;
      }

      const res = await fetch(`/api/tickets/${selectedTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToUpdateTicket"));
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : t("failedToUpdateTicket"));
    } finally {
      setSaving(false);
    }
  }

  // Delete ticket via DELETE
  async function handleDelete() {
    if (!selectedTicket) return;
    setSaving(true);
    setSaveError("");

    try {
      const res = await fetch(`/api/tickets/${selectedTicket.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToDeleteTicket"));
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : t("failedToDeleteTicket"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="tickets-page">
      {/* Header */}
      <div className="tickets-header">
        <div>
          <h2>{t("tickets")}</h2>
          <p className="tickets-header-sub">
            {t("ticketsTotalCount", { count: stats.total })}
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} />
          {t("newTicket")}
        </button>
      </div>

      {/* KPI Stats */}
      <div className="tickets-stats">
        <div className="tickets-stat-card stat-open">
          <div className="tickets-stat-icon">
            <AlertCircle size={20} />
          </div>
          <div className="tickets-stat-info">
            <span className="tickets-stat-value">{stats.open}</span>
            <span className="tickets-stat-label">{t("ticketStatusOpen")}</span>
          </div>
        </div>
        <div className="tickets-stat-card stat-in-progress">
          <div className="tickets-stat-icon">
            <Clock size={20} />
          </div>
          <div className="tickets-stat-info">
            <span className="tickets-stat-value">{stats.in_progress}</span>
            <span className="tickets-stat-label">{t("ticketStatusInProgress")}</span>
          </div>
        </div>
        <div className="tickets-stat-card stat-resolved">
          <div className="tickets-stat-icon">
            <CheckCircle2 size={20} />
          </div>
          <div className="tickets-stat-info">
            <span className="tickets-stat-value">{stats.resolved}</span>
            <span className="tickets-stat-label">{t("ticketStatusResolved")}</span>
          </div>
        </div>
        <div className="tickets-stat-card stat-closed">
          <div className="tickets-stat-icon">
            <Archive size={20} />
          </div>
          <div className="tickets-stat-info">
            <span className="tickets-stat-value">{stats.closed}</span>
            <span className="tickets-stat-label">{t("ticketStatusClosed")}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="tickets-filters">
        <div className="tickets-search">
          <Search size={16} className="tickets-search-icon" />
          <input
            type="text"
            placeholder={t("searchTickets")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="tickets-filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as TicketStatus | "all")}
        >
          <option value="all">{t("allStatus")}</option>
          {STATUS_KEYS.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>

        <select
          className="tickets-filter-select"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as TicketPriority | "all")}
        >
          <option value="all">{t("allPriority")}</option>
          {PRIORITY_KEYS.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABELS[p]}
            </option>
          ))}
        </select>

        <select
          className="tickets-filter-select"
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
        >
          <option value="all">{t("allAssignees")}</option>
          <option value="unassigned">{t("unassigned")}</option>
          {members.map((m) => (
            <option key={m.user_id} value={m.user_id}>
              {m.user?.full_name || m.user?.email || t("unknown")}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="tickets-empty">
          <div className="tickets-empty-icon">
            <Ticket size={28} />
          </div>
          {tickets.length === 0 ? (
            <>
              <h3>{t("noTicketsYet")}</h3>
              <p>{t("createFirstTicketDesc")}</p>
              <button className="btn-primary" onClick={() => setShowCreate(true)}>
                <Plus size={16} />
                {t("newTicket")}
              </button>
            </>
          ) : (
            <>
              <h3>{t("noMatchingTickets")}</h3>
              <p>{t("tryAdjustingFilters")}</p>
            </>
          )}
        </div>
      ) : (
        <div className="tickets-table-wrap">
          <table className="tickets-table">
            <thead>
              <tr>
                <th>{t("ticketNumber")}</th>
                <th>{t("title")}</th>
                <th>{t("status")}</th>
                <th>{t("priority")}</th>
                <th>{t("category")}</th>
                <th>{t("assignee")}</th>
                <th>{t("created")}</th>
                <th>{t("updated")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ticket) => (
                <tr
                  key={ticket.id}
                  onClick={() => openDetail(ticket)}
                  className="tickets-table-row"
                >
                  <td className="ticket-number-cell">{ticket.ticket_number}</td>
                  <td className="ticket-title-cell">{ticket.title}</td>
                  <td>
                    <span className={`ticket-status-badge status-${ticket.status}`}>
                      {STATUS_LABELS[ticket.status] ?? ticket.status}
                    </span>
                  </td>
                  <td>
                    <span className={`ticket-priority-badge priority-${ticket.priority}`}>
                      {PRIORITY_LABELS[ticket.priority] ?? ticket.priority}
                    </span>
                  </td>
                  <td className="ticket-category-cell">
                    {ticket.category || "--"}
                  </td>
                  <td className="ticket-assignee-cell">
                    {getUserName(ticket.assignee)}
                  </td>
                  <td className="ticket-date-cell">
                    {formatDateShort(ticket.created_at)}
                  </td>
                  <td className="ticket-date-cell">
                    {formatDateShort(ticket.updated_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Ticket Modal */}
      {showCreate && (
        <div className="ticket-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>{t("createNewTicket")}</h3>
              <button
                className="ticket-modal-close"
                onClick={() => setShowCreate(false)}
              >
                <X size={18} />
              </button>
            </div>

            {createError && (
              <div className="ticket-form-error">{createError}</div>
            )}

            <form onSubmit={handleCreate} className="ticket-form">
              <div className="ticket-form-group">
                <label className="ticket-form-label">{t("title")} *</label>
                <input
                  type="text"
                  className="ticket-form-input"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder={t("briefDescriptionOfIssue")}
                  required
                />
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">{t("description")}</label>
                <textarea
                  className="ticket-form-textarea"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder={t("provideMoreDetailsAboutIssue")}
                  rows={4}
                />
              </div>

              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("priority")}</label>
                  <select
                    className="ticket-form-select"
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        priority: e.target.value as TicketPriority,
                      })
                    }
                  >
                    {PRIORITY_KEYS.map((p) => (
                      <option key={p} value={p}>
                        {PRIORITY_LABELS[p]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("category")}</label>
                  <select
                    className="ticket-form-select"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                  >
                    <option value="">{t("selectCategory")}</option>
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">{t("assignTo")}</label>
                <select
                  className="ticket-form-select"
                  value={formData.assigned_to}
                  onChange={(e) =>
                    setFormData({ ...formData, assigned_to: e.target.value })
                  }
                >
                  <option value="">{t("unassigned")}</option>
                  {members.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.user?.full_name || m.user?.email || t("unknown")} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">{t("tags")}</label>
                <input
                  type="text"
                  className="ticket-form-input"
                  value={formData.tags}
                  onChange={(e) =>
                    setFormData({ ...formData, tags: e.target.value })
                  }
                  placeholder={t("commaSeparatedTagsPlaceholder")}
                />
              </div>

              <div className="ticket-form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreate(false)}
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={creating || !formData.title.trim()}
                >
                  {creating ? t("creating") : t("createTicket")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail / Edit / Delete Modal */}
      {selectedTicket && (
        <div className="ticket-modal-overlay" onClick={closeDetail}>
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>
                {isEditing
                  ? t("editTicketNumber", { number: selectedTicket.ticket_number })
                  : selectedTicket.ticket_number}
              </h3>
              <button className="ticket-modal-close" onClick={closeDetail}>
                <X size={18} />
              </button>
            </div>

            {saveError && (
              <div className="ticket-form-error">{saveError}</div>
            )}

            {/* Delete Confirmation */}
            {showDeleteConfirm && (
              <div
                className="ticket-modal-overlay"
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  position: "absolute",
                  zIndex: 1000,
                  borderRadius: "inherit",
                }}
              >
                <div
                  className="ticket-modal"
                  onClick={(e) => e.stopPropagation()}
                  style={{ maxWidth: 440 }}
                >
                  <div className="ticket-modal-header">
                    <h3>{t("deleteTicket")}</h3>
                    <button
                      className="ticket-modal-close"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div style={{ padding: "1rem 1.5rem" }}>
                    <p>
                      {t("confirmDeleteTicket", { number: selectedTicket.ticket_number })}
                    </p>
                  </div>
                  <div className="ticket-form-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={saving}
                    >
                      {t("cancel")}
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ backgroundColor: "var(--color-danger, #dc2626)" }}
                      onClick={handleDelete}
                      disabled={saving}
                    >
                      {saving ? t("deleting") : t("delete")}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Read-only detail view */}
            {!isEditing && (
              <div className="ticket-form" style={{ pointerEvents: showDeleteConfirm ? "none" : "auto" }}>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("title")}</label>
                  <div className="ticket-detail-value">
                    {selectedTicket.title}
                  </div>
                </div>

                {selectedTicket.description && (
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("description")}</label>
                    <div className="ticket-detail-value--multiline">
                      {selectedTicket.description}
                    </div>
                  </div>
                )}

                <div className="ticket-form-row">
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("status")}</label>
                    <div className="ticket-detail-value">
                      <span className={`ticket-status-badge status-${selectedTicket.status}`}>
                        {STATUS_LABELS[selectedTicket.status] ?? selectedTicket.status}
                      </span>
                    </div>
                  </div>
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("priority")}</label>
                    <div className="ticket-detail-value">
                      <span className={`ticket-priority-badge priority-${selectedTicket.priority}`}>
                        {PRIORITY_LABELS[selectedTicket.priority] ?? selectedTicket.priority}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="ticket-form-row">
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("category")}</label>
                    <div className={`ticket-detail-value${!selectedTicket.category ? " ticket-detail-value--empty" : ""}`}>
                      {selectedTicket.category || t("notSet")}
                    </div>
                  </div>
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("assignee")}</label>
                    <div className="ticket-detail-value">
                      {getUserName(selectedTicket.assignee)}
                    </div>
                  </div>
                </div>

                {selectedTicket.tags && selectedTicket.tags.length > 0 && (
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("tags")}</label>
                    <div className="ticket-detail-value">
                      {selectedTicket.tags.join(", ")}
                    </div>
                  </div>
                )}

                <div className="ticket-form-row">
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("created")}</label>
                    <div className="ticket-detail-value">
                      {formatDate(selectedTicket.created_at)}
                    </div>
                  </div>
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("updated")}</label>
                    <div className="ticket-detail-value">
                      {formatDate(selectedTicket.updated_at)}
                    </div>
                  </div>
                </div>

                {selectedTicket.resolved_at && (
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("resolved")}</label>
                    <div className="ticket-detail-value">
                      {formatDate(selectedTicket.resolved_at)}
                    </div>
                  </div>
                )}

                <div className="ticket-form-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ color: "var(--color-danger, #dc2626)" }}
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 size={16} />
                    {t("delete")}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={closeDetail}
                  >
                    {t("close")}
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={startEditing}
                  >
                    <Edit3 size={16} />
                    {t("edit")}
                  </button>
                </div>
              </div>
            )}

            {/* Edit view */}
            {isEditing && (
              <div className="ticket-form">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("title")} *</label>
                  <input
                    type="text"
                    className="ticket-form-input"
                    value={(editData.title as string) || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, title: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("description")}</label>
                  <textarea
                    className="ticket-form-textarea"
                    value={(editData.description as string) || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, description: e.target.value })
                    }
                    rows={4}
                  />
                </div>

                <div className="ticket-form-row">
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("status")}</label>
                    <select
                      className="ticket-form-select"
                      value={(editData.status as string) || "open"}
                      onChange={(e) =>
                        setEditData({ ...editData, status: e.target.value })
                      }
                    >
                      {STATUS_KEYS.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("priority")}</label>
                    <select
                      className="ticket-form-select"
                      value={(editData.priority as string) || "medium"}
                      onChange={(e) =>
                        setEditData({ ...editData, priority: e.target.value })
                      }
                    >
                      {PRIORITY_KEYS.map((p) => (
                        <option key={p} value={p}>
                          {PRIORITY_LABELS[p]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="ticket-form-row">
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("category")}</label>
                    <select
                      className="ticket-form-select"
                      value={(editData.category as string) || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, category: e.target.value })
                      }
                    >
                      <option value="">{t("selectCategory")}</option>
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("assignTo")}</label>
                    <select
                      className="ticket-form-select"
                      value={(editData.assigned_to as string) || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, assigned_to: e.target.value })
                      }
                    >
                      <option value="">{t("unassigned")}</option>
                      {members.map((m) => (
                        <option key={m.user_id} value={m.user_id}>
                          {m.user?.full_name || m.user?.email || t("unknown")} ({m.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="ticket-form-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={cancelEditing}
                    disabled={saving}
                  >
                    {t("cancel")}
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleSave}
                    disabled={saving || !(editData.title as string)?.trim()}
                  >
                    {saving ? t("saving") : t("saveChanges")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
