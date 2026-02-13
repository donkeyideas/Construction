"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  X,
  Ticket,
  AlertCircle,
  Clock,
  CheckCircle2,
  Archive,
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
// Constants
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const CATEGORIES: TicketCategory[] = [
  "IT",
  "HR",
  "Operations",
  "Finance",
  "Safety",
  "Equipment",
  "General",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string | null) {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateShort(dateStr: string | null) {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getUserName(
  user: { id: string; full_name: string; email: string } | null | undefined
): string {
  if (!user) return "Unassigned";
  return user.full_name || user.email || "Unknown";
}

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

  // Filtered tickets
  const filtered = useMemo(() => {
    let result = tickets;

    if (statusFilter !== "all") {
      result = result.filter((t) => t.status === statusFilter);
    }

    if (priorityFilter !== "all") {
      result = result.filter((t) => t.priority === priorityFilter);
    }

    if (assigneeFilter !== "all") {
      if (assigneeFilter === "unassigned") {
        result = result.filter((t) => !t.assigned_to);
      } else {
        result = result.filter((t) => t.assigned_to === assigneeFilter);
      }
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(term) ||
          t.ticket_number.toLowerCase().includes(term) ||
          (t.description && t.description.toLowerCase().includes(term))
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
        .map((t) => t.trim())
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
        throw new Error(data.error || "Failed to create ticket");
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
      setCreateError(err instanceof Error ? err.message : "Failed to create ticket");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="tickets-page">
      {/* Header */}
      <div className="tickets-header">
        <div>
          <h2>Tickets</h2>
          <p className="tickets-header-sub">
            {stats.total} ticket{stats.total !== 1 ? "s" : ""} total
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} />
          New Ticket
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
            <span className="tickets-stat-label">Open</span>
          </div>
        </div>
        <div className="tickets-stat-card stat-in-progress">
          <div className="tickets-stat-icon">
            <Clock size={20} />
          </div>
          <div className="tickets-stat-info">
            <span className="tickets-stat-value">{stats.in_progress}</span>
            <span className="tickets-stat-label">In Progress</span>
          </div>
        </div>
        <div className="tickets-stat-card stat-resolved">
          <div className="tickets-stat-icon">
            <CheckCircle2 size={20} />
          </div>
          <div className="tickets-stat-info">
            <span className="tickets-stat-value">{stats.resolved}</span>
            <span className="tickets-stat-label">Resolved</span>
          </div>
        </div>
        <div className="tickets-stat-card stat-closed">
          <div className="tickets-stat-icon">
            <Archive size={20} />
          </div>
          <div className="tickets-stat-info">
            <span className="tickets-stat-value">{stats.closed}</span>
            <span className="tickets-stat-label">Closed</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="tickets-filters">
        <div className="tickets-search">
          <Search size={16} className="tickets-search-icon" />
          <input
            type="text"
            placeholder="Search tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="tickets-filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as TicketStatus | "all")}
        >
          <option value="all">All Status</option>
          {(Object.keys(STATUS_LABELS) as TicketStatus[]).map((s) => (
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
          <option value="all">All Priority</option>
          {(Object.keys(PRIORITY_LABELS) as TicketPriority[]).map((p) => (
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
          <option value="all">All Assignees</option>
          <option value="unassigned">Unassigned</option>
          {members.map((m) => (
            <option key={m.user_id} value={m.user_id}>
              {m.user?.full_name || m.user?.email || "Unknown"}
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
              <h3>No tickets yet</h3>
              <p>Create your first support ticket to get started.</p>
              <button className="btn-primary" onClick={() => setShowCreate(true)}>
                <Plus size={16} />
                New Ticket
              </button>
            </>
          ) : (
            <>
              <h3>No matching tickets</h3>
              <p>Try adjusting your search or filter criteria.</p>
            </>
          )}
        </div>
      ) : (
        <div className="tickets-table-wrap">
          <table className="tickets-table">
            <thead>
              <tr>
                <th>Ticket #</th>
                <th>Title</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Category</th>
                <th>Assignee</th>
                <th>Created</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ticket) => (
                <tr
                  key={ticket.id}
                  onClick={() => router.push(`/tickets/${ticket.id}`)}
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
              <h3>Create New Ticket</h3>
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
                <label className="ticket-form-label">Title *</label>
                <input
                  type="text"
                  className="ticket-form-input"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Brief description of the issue"
                  required
                />
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">Description</label>
                <textarea
                  className="ticket-form-textarea"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Provide more details about the issue..."
                  rows={4}
                />
              </div>

              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Priority</label>
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
                    {(Object.keys(PRIORITY_LABELS) as TicketPriority[]).map((p) => (
                      <option key={p} value={p}>
                        {PRIORITY_LABELS[p]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">Category</label>
                  <select
                    className="ticket-form-select"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                  >
                    <option value="">Select category...</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">Assign To</label>
                <select
                  className="ticket-form-select"
                  value={formData.assigned_to}
                  onChange={(e) =>
                    setFormData({ ...formData, assigned_to: e.target.value })
                  }
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.user?.full_name || m.user?.email || "Unknown"} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">Tags</label>
                <input
                  type="text"
                  className="ticket-form-input"
                  value={formData.tags}
                  onChange={(e) =>
                    setFormData({ ...formData, tags: e.target.value })
                  }
                  placeholder="Comma-separated tags (e.g. network, urgent, site-a)"
                />
              </div>

              <div className="ticket-form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={creating || !formData.title.trim()}
                >
                  {creating ? "Creating..." : "Create Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
