"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Send,
  User,
  Tag,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  PlayCircle,
  Archive,
  ChevronRight,
} from "lucide-react";
import type {
  TicketRow,
  TicketComment,
  CompanyMember,
  TicketStatus,
  TicketPriority,
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

const CATEGORIES = [
  "IT",
  "HR",
  "Operations",
  "Finance",
  "Safety",
  "Equipment",
  "General",
];

// Status transitions: which statuses can each status transition to
const STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  open: ["in_progress"],
  in_progress: ["open", "resolved"],
  resolved: ["in_progress", "closed"],
  closed: ["open"],
};

const STATUS_ICONS: Record<TicketStatus, React.ReactNode> = {
  open: <AlertCircle size={14} />,
  in_progress: <PlayCircle size={14} />,
  resolved: <CheckCircle2 size={14} />,
  closed: <Archive size={14} />,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateTime(dateStr: string | null) {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatRelativeTime(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDateTime(dateStr);
}

function getUserName(
  user: { id: string; full_name: string; email: string } | null | undefined
): string {
  if (!user) return "Unknown";
  return user.full_name || user.email || "Unknown";
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface TicketDetailClientProps {
  ticket: TicketRow;
  comments: TicketComment[];
  members: CompanyMember[];
  userId: string;
  companyId: string;
}

export default function TicketDetailClient({
  ticket,
  comments,
  members,
  userId,
  companyId,
}: TicketDetailClientProps) {
  const router = useRouter();

  // State
  const [updating, setUpdating] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [error, setError] = useState("");

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  async function handleStatusChange(newStatus: TicketStatus) {
    setUpdating(true);
    setError("");

    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update status");
      }

      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setUpdating(false);
    }
  }

  async function handleFieldUpdate(field: string, value: string | null) {
    setUpdating(true);
    setError("");

    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value || null }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update ticket");
      }

      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update ticket");
    } finally {
      setUpdating(false);
    }
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentBody.trim()) return;

    setSubmittingComment(true);
    setError("");

    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: commentBody.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add comment");
      }

      setCommentBody("");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add comment");
    } finally {
      setSubmittingComment(false);
    }
  }

  // Available transitions
  const transitions = STATUS_TRANSITIONS[ticket.status] || [];

  return (
    <div className="ticket-detail">
      {/* Back button */}
      <button className="ticket-back-btn" onClick={() => router.push("/tickets")}>
        <ArrowLeft size={16} />
        Back to Tickets
      </button>

      {error && <div className="ticket-form-error">{error}</div>}

      <div className="ticket-detail-layout">
        {/* Main Column */}
        <div className="ticket-main">
          {/* Title & Meta */}
          <div className="ticket-main-header">
            <div className="ticket-number-label">{ticket.ticket_number}</div>
            <h1 className="ticket-detail-title">{ticket.title}</h1>
            <div className="ticket-meta-row">
              <span className={`ticket-status-badge status-${ticket.status}`}>
                {STATUS_LABELS[ticket.status]}
              </span>
              <span className={`ticket-priority-badge priority-${ticket.priority}`}>
                {PRIORITY_LABELS[ticket.priority]}
              </span>
              {ticket.category && (
                <span className="ticket-category-tag">{ticket.category}</span>
              )}
            </div>
          </div>

          {/* Description */}
          {ticket.description && (
            <div className="ticket-description">
              <h3>Description</h3>
              <p>{ticket.description}</p>
            </div>
          )}

          {/* Tags */}
          {ticket.tags && ticket.tags.length > 0 && (
            <div className="ticket-tags-section">
              <h3>Tags</h3>
              <div className="ticket-tags-list">
                {ticket.tags.map((tag, i) => (
                  <span key={i} className="ticket-tag">
                    <Tag size={12} />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Comments Thread */}
          <div className="ticket-comments">
            <h3>
              Comments
              <span className="ticket-comments-count">({comments.length})</span>
            </h3>

            {comments.length === 0 ? (
              <div className="ticket-comments-empty">
                No comments yet. Be the first to comment.
              </div>
            ) : (
              <div className="ticket-comments-list">
                {comments.map((comment) => (
                  <div key={comment.id} className="ticket-comment">
                    <div className="ticket-comment-avatar">
                      {getInitials(getUserName(comment.user))}
                    </div>
                    <div className="ticket-comment-content">
                      <div className="ticket-comment-header">
                        <span className="ticket-comment-author">
                          {getUserName(comment.user)}
                        </span>
                        <span className="ticket-comment-time">
                          {formatRelativeTime(comment.created_at)}
                        </span>
                      </div>
                      <div className="ticket-comment-body">{comment.body}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Comment Form */}
            <form onSubmit={handleAddComment} className="ticket-comment-form">
              <textarea
                className="ticket-comment-input"
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                placeholder="Write a comment..."
                rows={3}
              />
              <div className="ticket-comment-form-actions">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={submittingComment || !commentBody.trim()}
                >
                  <Send size={14} />
                  {submittingComment ? "Sending..." : "Add Comment"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="ticket-sidebar">
          {/* Status Transitions */}
          <div className="ticket-sidebar-section">
            <h4>Status</h4>
            <div className="ticket-current-status">
              <span className={`ticket-status-badge status-${ticket.status}`}>
                {STATUS_ICONS[ticket.status]}
                {STATUS_LABELS[ticket.status]}
              </span>
            </div>
            {transitions.length > 0 && (
              <div className="ticket-status-transitions">
                {transitions.map((nextStatus) => (
                  <button
                    key={nextStatus}
                    className={`ticket-transition-btn transition-${nextStatus}`}
                    onClick={() => handleStatusChange(nextStatus)}
                    disabled={updating}
                  >
                    {STATUS_ICONS[nextStatus]}
                    <span>Move to {STATUS_LABELS[nextStatus]}</span>
                    <ChevronRight size={14} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Priority */}
          <div className="ticket-sidebar-section">
            <h4>Priority</h4>
            <select
              className="ticket-sidebar-select"
              value={ticket.priority}
              onChange={(e) => handleFieldUpdate("priority", e.target.value)}
              disabled={updating}
            >
              {(Object.keys(PRIORITY_LABELS) as TicketPriority[]).map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div className="ticket-sidebar-section">
            <h4>Category</h4>
            <select
              className="ticket-sidebar-select"
              value={ticket.category || ""}
              onChange={(e) => handleFieldUpdate("category", e.target.value)}
              disabled={updating}
            >
              <option value="">No Category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Assignee */}
          <div className="ticket-sidebar-section">
            <h4>Assignee</h4>
            <select
              className="ticket-sidebar-select"
              value={ticket.assigned_to || ""}
              onChange={(e) => handleFieldUpdate("assigned_to", e.target.value)}
              disabled={updating}
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.user?.full_name || m.user?.email || "Unknown"}
                </option>
              ))}
            </select>
          </div>

          {/* Details */}
          <div className="ticket-sidebar-section">
            <h4>Details</h4>
            <div className="ticket-sidebar-details">
              <div className="ticket-sidebar-detail">
                <span className="ticket-sidebar-detail-label">
                  <User size={14} /> Created by
                </span>
                <span className="ticket-sidebar-detail-value">
                  {getUserName(ticket.creator)}
                </span>
              </div>
              <div className="ticket-sidebar-detail">
                <span className="ticket-sidebar-detail-label">
                  <Calendar size={14} /> Created
                </span>
                <span className="ticket-sidebar-detail-value">
                  {formatDateTime(ticket.created_at)}
                </span>
              </div>
              <div className="ticket-sidebar-detail">
                <span className="ticket-sidebar-detail-label">
                  <Clock size={14} /> Updated
                </span>
                <span className="ticket-sidebar-detail-value">
                  {formatDateTime(ticket.updated_at)}
                </span>
              </div>
              {ticket.resolved_at && (
                <div className="ticket-sidebar-detail">
                  <span className="ticket-sidebar-detail-label">
                    <CheckCircle2 size={14} /> Resolved
                  </span>
                  <span className="ticket-sidebar-detail-value">
                    {formatDateTime(ticket.resolved_at)}
                  </span>
                </div>
              )}
              {ticket.closed_at && (
                <div className="ticket-sidebar-detail">
                  <span className="ticket-sidebar-detail-label">
                    <Archive size={14} /> Closed
                  </span>
                  <span className="ticket-sidebar-detail-value">
                    {formatDateTime(ticket.closed_at)}
                  </span>
                </div>
              )}
              {ticket.resolver && (
                <div className="ticket-sidebar-detail">
                  <span className="ticket-sidebar-detail-label">
                    <User size={14} /> Resolved by
                  </span>
                  <span className="ticket-sidebar-detail-value">
                    {getUserName(ticket.resolver)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
