"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { formatDateSafe } from "@/lib/utils/format";
import {
  Headphones,
  MessageSquare,
  Clock,
  AlertCircle,
  Filter,
  Send,
  Lock,
  X,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SupportTicket {
  id: string;
  ticket_number: number;
  company_id: string | null;
  user_id: string | null;
  subject: string;
  description: string | null;
  status: "open" | "in_progress" | "waiting" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  category: string;
  assigned_to: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  user_full_name: string | null;
  user_email: string | null;
  company_name: string | null;
  assigned_name: string | null;
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  user_id: string | null;
  message: string;
  is_internal: boolean;
  created_at: string;
  user_full_name: string | null;
  user_email: string | null;
}

interface TicketWithMessages extends SupportTicket {
  messages: TicketMessage[];
}

interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  avgResolutionHours: number | null;
}

interface Props {
  tickets: SupportTicket[];
  stats: TicketStats;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string): string {
  return formatDateSafe(dateStr);
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function statusBadgeClass(
  status: string
): string {
  switch (status) {
    case "open":
      return "sa-badge sa-badge-blue";
    case "in_progress":
      return "sa-badge sa-badge-amber";
    case "waiting":
      return "sa-badge sa-badge-purple";
    case "resolved":
      return "sa-badge sa-badge-green";
    case "closed":
      return "sa-badge sa-badge-gray";
    default:
      return "sa-badge";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "open":
      return "Open";
    case "in_progress":
      return "In Progress";
    case "waiting":
      return "Waiting";
    case "resolved":
      return "Resolved";
    case "closed":
      return "Closed";
    default:
      return status;
  }
}

function priorityBadgeClass(priority: string): string {
  switch (priority) {
    case "urgent":
      return "sa-badge sa-badge-red";
    case "high":
      return "sa-badge sa-badge-amber";
    case "medium":
      return "sa-badge sa-badge-blue";
    case "low":
      return "sa-badge sa-badge-gray";
    default:
      return "sa-badge";
  }
}

function categoryLabel(category: string): string {
  switch (category) {
    case "general":
      return "General";
    case "billing":
      return "Billing";
    case "technical":
      return "Technical";
    case "feature_request":
      return "Feature Request";
    case "bug_report":
      return "Bug Report";
    case "account":
      return "Account";
    default:
      return category;
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function SupportTicketsClient({ tickets, stats }: Props) {
  const router = useRouter();
  const t = useTranslations("superAdmin");

  // Filters
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filteredTickets, setFilteredTickets] = useState(tickets);
  const [loading, setLoading] = useState(false);

  // Detail panel
  const [selectedTicket, setSelectedTicket] =
    useState<TicketWithMessages | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Reply form
  const [replyMessage, setReplyMessage] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);

  // Status / assignment change
  const [newStatus, setNewStatus] = useState("");
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Messages
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* ---- Filter tickets client-side or refetch ---- */
  const applyFilters = useCallback(async () => {
    const hasFilters = filterStatus || filterPriority || filterCategory;
    if (!hasFilters) {
      setFilteredTickets(tickets);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      if (filterPriority) params.set("priority", filterPriority);
      if (filterCategory) params.set("category", filterCategory);

      const res = await fetch(
        `/api/super-admin/support-tickets?${params.toString()}`
      );
      if (res.ok) {
        const data = await res.json();
        setFilteredTickets(data.tickets);
      }
    } catch {
      // Fall back to client-side filtering
      let result = [...tickets];
      if (filterStatus)
        result = result.filter((t) => t.status === filterStatus);
      if (filterPriority)
        result = result.filter((t) => t.priority === filterPriority);
      if (filterCategory)
        result = result.filter((t) => t.category === filterCategory);
      setFilteredTickets(result);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterPriority, filterCategory, tickets]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  /* ---- Open ticket detail ---- */
  async function openTicketDetail(ticketId: string) {
    setDetailLoading(true);
    setSelectedTicket(null);
    setReplyMessage("");
    setIsInternal(false);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(
        `/api/super-admin/support-tickets/${ticketId}`
      );
      if (res.ok) {
        const data = await res.json();
        setSelectedTicket(data.ticket);
        setNewStatus(data.ticket.status);
      } else {
        setError("Failed to load ticket details.");
      }
    } catch {
      setError("Network error loading ticket.");
    } finally {
      setDetailLoading(false);
    }
  }

  /* ---- Close detail panel ---- */
  function closeDetail() {
    setSelectedTicket(null);
    setReplyMessage("");
    setIsInternal(false);
    setNewStatus("");
    setError("");
  }

  /* ---- Send reply ---- */
  async function handleSendReply() {
    if (!selectedTicket || !replyMessage.trim()) return;

    setSending(true);
    setError("");

    try {
      const res = await fetch(
        `/api/super-admin/support-tickets/${selectedTicket.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: replyMessage.trim(),
            is_internal: isInternal,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to send message.");
        return;
      }

      // Refresh the ticket detail to show new message
      setReplyMessage("");
      setIsInternal(false);
      await openTicketDetail(selectedTicket.id);
      setSuccess("Message sent.");
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Network error sending message.");
    } finally {
      setSending(false);
    }
  }

  /* ---- Update ticket status ---- */
  async function handleStatusChange(status: string) {
    if (!selectedTicket || status === selectedTicket.status) return;

    setStatusUpdating(true);
    setError("");

    try {
      const res = await fetch("/api/super-admin/support-tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedTicket.id,
          status,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to update status.");
        return;
      }

      setNewStatus(status);
      // Refresh both detail and list
      await openTicketDetail(selectedTicket.id);
      router.refresh();
      setSuccess("Status updated.");
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Network error updating status.");
    } finally {
      setStatusUpdating(false);
    }
  }

  /* ---- Clear filters ---- */
  function clearFilters() {
    setFilterStatus("");
    setFilterPriority("");
    setFilterCategory("");
  }

  const hasActiveFilters = filterStatus || filterPriority || filterCategory;

  return (
    <>
      {/* ---- Header ---- */}
      <div className="admin-header">
        <div>
          <h2>{t("supportTickets.title")}</h2>
          <p className="admin-header-sub">
            {t("supportTickets.subtitle")}
          </p>
        </div>
      </div>

      {/* ---- KPI Cards ---- */}
      <div
        className="admin-stats"
        style={{ gridTemplateColumns: "repeat(4, 1fr)" }}
      >
        <div className="admin-stat-card">
          <div className="admin-stat-icon blue">
            <Headphones size={18} />
          </div>
          <div className="admin-stat-label">{t("supportTickets.totalTickets")}</div>
          <div className="admin-stat-value">{stats.total}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ background: "rgba(59,130,246,0.1)", color: "var(--color-blue)" }}>
            <MessageSquare size={18} />
          </div>
          <div className="admin-stat-label">{t("supportTickets.open")}</div>
          <div className="admin-stat-value">{stats.open}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ background: "rgba(245,158,11,0.1)", color: "var(--color-amber)" }}>
            <AlertCircle size={18} />
          </div>
          <div className="admin-stat-label">{t("supportTickets.inProgress")}</div>
          <div className="admin-stat-value">{stats.inProgress}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon green">
            <Clock size={18} />
          </div>
          <div className="admin-stat-label">{t("supportTickets.avgResolution")}</div>
          <div className="admin-stat-value">
            {stats.avgResolutionHours !== null
              ? `${stats.avgResolutionHours}h`
              : "--"}
          </div>
        </div>
      </div>

      {/* ---- Feedback Messages ---- */}
      {error && <div className="invite-error">{error}</div>}
      {success && <div className="invite-success">{success}</div>}

      {/* ---- Filter Bar ---- */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <Filter size={16} style={{ color: "var(--muted)" }} />

        <select
          className="ticket-form-input"
          style={{ width: "auto", minWidth: 140, padding: "6px 10px", fontSize: "0.82rem" }}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">{t("supportTickets.allStatuses")}</option>
          <option value="open">{t("supportTickets.statusOpen")}</option>
          <option value="in_progress">{t("supportTickets.statusInProgress")}</option>
          <option value="waiting">{t("supportTickets.statusWaiting")}</option>
          <option value="resolved">{t("supportTickets.statusResolved")}</option>
          <option value="closed">{t("supportTickets.statusClosed")}</option>
        </select>

        <select
          className="ticket-form-input"
          style={{ width: "auto", minWidth: 140, padding: "6px 10px", fontSize: "0.82rem" }}
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
        >
          <option value="">{t("supportTickets.allPriorities")}</option>
          <option value="urgent">{t("supportTickets.urgent")}</option>
          <option value="high">{t("supportTickets.high")}</option>
          <option value="medium">{t("supportTickets.medium")}</option>
          <option value="low">{t("supportTickets.low")}</option>
        </select>

        <select
          className="ticket-form-input"
          style={{ width: "auto", minWidth: 140, padding: "6px 10px", fontSize: "0.82rem" }}
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="">{t("supportTickets.allCategories")}</option>
          <option value="general">{t("supportTickets.catGeneral")}</option>
          <option value="billing">{t("supportTickets.catBilling")}</option>
          <option value="technical">{t("supportTickets.catTechnical")}</option>
          <option value="feature_request">{t("supportTickets.catFeatureRequest")}</option>
          <option value="bug_report">{t("supportTickets.catBugReport")}</option>
          <option value="account">{t("supportTickets.catAccount")}</option>
        </select>

        {hasActiveFilters && (
          <button
            className="sa-action-btn"
            onClick={clearFilters}
            style={{ fontSize: "0.78rem", padding: "5px 10px" }}
          >
            {t("supportTickets.clear")}
          </button>
        )}
      </div>

      {/* ---- Ticket Table ---- */}
      <div className="sa-table-wrap" style={{ opacity: loading ? 0.6 : 1 }}>
        <table className="sa-table">
          <thead>
            <tr>
              <th>#</th>
              <th>{t("supportTickets.thSubject")}</th>
              <th>{t("supportTickets.thUser")}</th>
              <th>{t("supportTickets.thCompany")}</th>
              <th>{t("supportTickets.thStatus")}</th>
              <th>{t("supportTickets.thPriority")}</th>
              <th>{t("supportTickets.thCategory")}</th>
              <th>{t("supportTickets.thCreated")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    color: "var(--muted)",
                  }}
                >
                  {t("supportTickets.noTicketsFound")}
                </td>
              </tr>
            ) : (
              filteredTickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => openTicketDetail(ticket.id)}
                >
                  <td style={{ fontWeight: 600, color: "var(--muted)", fontSize: "0.8rem" }}>
                    {ticket.ticket_number}
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{ticket.subject}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: "0.82rem" }}>
                      {ticket.user_full_name || "Unknown"}
                    </div>
                    <div
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--muted)",
                      }}
                    >
                      {ticket.user_email || ""}
                    </div>
                  </td>
                  <td style={{ fontSize: "0.82rem" }}>
                    {ticket.company_name || "--"}
                  </td>
                  <td>
                    <span className={statusBadgeClass(ticket.status)}>
                      {statusLabel(ticket.status)}
                    </span>
                  </td>
                  <td>
                    <span
                      className={priorityBadgeClass(ticket.priority)}
                      style={{ textTransform: "capitalize" }}
                    >
                      {ticket.priority}
                    </span>
                  </td>
                  <td style={{ fontSize: "0.82rem" }}>
                    {categoryLabel(ticket.category)}
                  </td>
                  <td
                    style={{
                      color: "var(--muted)",
                      fontSize: "0.8rem",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatDate(ticket.created_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ---- Ticket Detail Modal ---- */}
      {(selectedTicket || detailLoading) && (
        <div className="ticket-modal-overlay" onClick={closeDetail}>
          <div
            className="ticket-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 720, maxHeight: "90vh", display: "flex", flexDirection: "column", padding: 0 }}
          >
            {detailLoading && !selectedTicket ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
                Loading ticket...
              </div>
            ) : selectedTicket ? (
              <>
                {/* Modal Header */}
                <div
                  className="ticket-modal-header"
                  style={{
                    padding: "20px 24px",
                    borderBottom: "1px solid var(--border)",
                    margin: 0,
                    flexShrink: 0,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--muted)" }}>
                        #{selectedTicket.ticket_number}
                      </span>
                      <span className={statusBadgeClass(selectedTicket.status)}>
                        {statusLabel(selectedTicket.status)}
                      </span>
                      <span
                        className={priorityBadgeClass(selectedTicket.priority)}
                        style={{ textTransform: "capitalize" }}
                      >
                        {selectedTicket.priority}
                      </span>
                      <span className="sa-badge" style={{ textTransform: "capitalize" }}>
                        {categoryLabel(selectedTicket.category)}
                      </span>
                    </div>
                    <h3
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: "1.1rem",
                        fontWeight: 600,
                        margin: 0,
                        lineHeight: 1.3,
                      }}
                    >
                      {selectedTicket.subject}
                    </h3>
                    <div
                      style={{
                        fontSize: "0.78rem",
                        color: "var(--muted)",
                        marginTop: 4,
                      }}
                    >
                      {selectedTicket.user_full_name || "Unknown"}{" "}
                      ({selectedTicket.user_email || "no email"})
                      {selectedTicket.company_name && (
                        <> &middot; {selectedTicket.company_name}</>
                      )}
                      {" "}&middot; {formatDateTime(selectedTicket.created_at)}
                    </div>
                  </div>
                  <button className="ticket-modal-close" onClick={closeDetail}>
                    <X size={18} />
                  </button>
                </div>

                {/* Description */}
                {selectedTicket.description && (
                  <div
                    style={{
                      padding: "16px 24px",
                      borderBottom: "1px solid var(--border)",
                      fontSize: "0.88rem",
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                      flexShrink: 0,
                    }}
                  >
                    {selectedTicket.description}
                  </div>
                )}

                {/* Status / Assignment Controls */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 24px",
                    borderBottom: "1px solid var(--border)",
                    flexShrink: 0,
                    flexWrap: "wrap",
                  }}
                >
                  <div className="ticket-form-group" style={{ gap: 4, flex: "0 0 auto" }}>
                    <label
                      className="ticket-form-label"
                      style={{ fontSize: "0.7rem", margin: 0 }}
                    >
                      Status
                    </label>
                    <select
                      className="ticket-form-input"
                      style={{ width: "auto", minWidth: 130, padding: "5px 8px", fontSize: "0.8rem" }}
                      value={newStatus}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      disabled={statusUpdating}
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="waiting">Waiting</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>

                  {selectedTicket.assigned_name && (
                    <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                      Assigned to:{" "}
                      <span style={{ fontWeight: 500, color: "var(--text)" }}>
                        {selectedTicket.assigned_name}
                      </span>
                    </div>
                  )}
                </div>

                {/* Messages Thread */}
                <div
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: "16px 24px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    minHeight: 0,
                  }}
                >
                  {selectedTicket.messages.length === 0 ? (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "32px 0",
                        color: "var(--muted)",
                        fontSize: "0.85rem",
                      }}
                    >
                      No messages yet. Send the first reply below.
                    </div>
                  ) : (
                    selectedTicket.messages.map((msg) => (
                      <div
                        key={msg.id}
                        style={{
                          padding: "12px 16px",
                          borderRadius: 10,
                          background: msg.is_internal
                            ? "rgba(245,158,11,0.08)"
                            : "var(--surface)",
                          border: msg.is_internal
                            ? "1px dashed rgba(245,158,11,0.3)"
                            : "1px solid var(--border)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 6,
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.8rem",
                              fontWeight: 600,
                            }}
                          >
                            {msg.user_full_name || msg.user_email || "Unknown"}
                          </span>
                          <span
                            style={{
                              fontSize: "0.72rem",
                              color: "var(--muted)",
                            }}
                          >
                            {formatDateTime(msg.created_at)}
                          </span>
                          {msg.is_internal && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 3,
                                fontSize: "0.68rem",
                                fontWeight: 600,
                                color: "var(--color-amber)",
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                              }}
                            >
                              <Lock size={10} /> Internal
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: "0.85rem",
                            lineHeight: 1.6,
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {msg.message}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Reply Form */}
                <div
                  style={{
                    padding: "16px 24px",
                    borderTop: "1px solid var(--border)",
                    flexShrink: 0,
                  }}
                >
                  <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                    <textarea
                      className="ticket-form-input"
                      placeholder="Type your reply..."
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      rows={3}
                      style={{
                        flex: 1,
                        resize: "vertical",
                        minHeight: 60,
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: "0.8rem",
                        color: "var(--muted)",
                        cursor: "pointer",
                        userSelect: "none",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isInternal}
                        onChange={(e) => setIsInternal(e.target.checked)}
                        style={{ accentColor: "var(--color-amber)" }}
                      />
                      <Lock size={12} />
                      {t("supportTickets.internalNote")}
                    </label>
                    <button
                      className="sa-action-btn primary"
                      onClick={handleSendReply}
                      disabled={sending || !replyMessage.trim()}
                      style={{ fontSize: "0.82rem" }}
                    >
                      <Send size={14} />
                      {sending ? t("supportTickets.sending") : t("supportTickets.send")}
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
