"use client";

import { useState, useMemo, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRealtimeSubscription } from "@/lib/supabase/realtime";
import {
  Search,
  Mail,
  Bell,
  Send,
  Archive,
  Reply,
  X,
  Plus,
  Inbox,
  CheckCheck,
  Megaphone,
  Headphones,
} from "lucide-react";
import type {
  InboxItem,
  CompanyMember,
  Message,
  PlatformAnnouncement,
  UserSupportTicket,
  UserTicketDetail,
  TicketMessageItem,
} from "@/lib/queries/inbox";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(dateStr: string, dateLocale: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return new Date(dateStr).toLocaleDateString(dateLocale, {
    month: "short",
    day: "numeric",
  });
}

function formatFullDate(dateStr: string, dateLocale: string): string {
  return new Date(dateStr).toLocaleDateString(dateLocale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type TabFilter = "all" | "messages" | "notifications" | "announcements" | "support";

// ---------------------------------------------------------------------------
// Component Props
// ---------------------------------------------------------------------------

interface InboxClientProps {
  items: InboxItem[];
  unreadCount: number;
  userId: string;
  companyId: string;
  members: CompanyMember[];
  announcements: PlatformAnnouncement[];
  supportTickets: UserSupportTicket[];
}

// ---------------------------------------------------------------------------
// Support ticket helpers
// ---------------------------------------------------------------------------

function ticketStatusClass(status: string): string {
  switch (status) {
    case "open": return "inbox-ticket-status open";
    case "in_progress": return "inbox-ticket-status in-progress";
    case "waiting": return "inbox-ticket-status waiting";
    case "resolved": return "inbox-ticket-status resolved";
    case "closed": return "inbox-ticket-status closed";
    default: return "inbox-ticket-status";
  }
}

// ticketStatusLabel is defined inside the component to access t()

function ticketPriorityClass(priority: string): string {
  switch (priority) {
    case "urgent": return "inbox-ticket-priority urgent";
    case "high": return "inbox-ticket-priority high";
    case "medium": return "inbox-ticket-priority medium";
    case "low": return "inbox-ticket-priority low";
    default: return "inbox-ticket-priority";
  }
}

// ticketCategoryLabel is defined inside the component to access t()

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function InboxClient({
  items: initialItems,
  unreadCount: initialUnreadCount,
  userId,
  companyId,
  members,
  announcements,
  supportTickets: initialSupportTickets,
}: InboxClientProps) {
  const t = useTranslations("app");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  function ticketStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      open: t("inboxTicketStatusOpen"),
      in_progress: t("inboxTicketStatusInProgress"),
      waiting: t("inboxTicketStatusWaiting"),
      resolved: t("inboxTicketStatusResolved"),
      closed: t("inboxTicketStatusClosed"),
    };
    return labels[status] || status;
  }

  function ticketCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      general: t("inboxTicketCategoryGeneral"),
      billing: t("inboxTicketCategoryBilling"),
      technical: t("inboxTicketCategoryTechnical"),
      feature_request: t("inboxTicketCategoryFeatureRequest"),
      bug_report: t("inboxTicketCategoryBugReport"),
      account: t("inboxTicketCategoryAccount"),
    };
    return labels[category] || category;
  }

  // Convert announcements to InboxItems
  const announcementItems: InboxItem[] = useMemo(
    () =>
      announcements.map((a) => ({
        id: `ann-${a.id}`,
        kind: "announcement" as const,
        title: a.title,
        preview: a.content.length > 120 ? a.content.slice(0, 120) + "..." : a.content,
        sender_name: "Buildwrk",
        is_read: true,
        created_at: a.published_at || a.created_at,
        entity_type: null,
        entity_id: null,
        announcement: a,
      })),
    [announcements]
  );

  const [items, setItems] = useState<InboxItem[]>(initialItems);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [showReply, setShowReply] = useState(false);
  const [thread, setThread] = useState<Message[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);

  // Compose form state
  const [composeRecipient, setComposeRecipient] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeSending, setComposeSending] = useState(false);
  const [composeError, setComposeError] = useState("");

  // Reply form state
  const [replyBody, setReplyBody] = useState("");
  const [replySending, setReplySending] = useState(false);

  // Support ticket state
  const [tickets, setTickets] = useState<UserSupportTicket[]>(initialSupportTickets);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedTicketDetail, setSelectedTicketDetail] = useState<UserTicketDetail | null>(null);
  const [loadingTicketDetail, setLoadingTicketDetail] = useState(false);
  const [showCreateTicket, setShowCreateTicket] = useState(false);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketDescription, setTicketDescription] = useState("");
  const [ticketCategory, setTicketCategory] = useState("general");
  const [ticketPriority, setTicketPriority] = useState("medium");
  const [ticketCreating, setTicketCreating] = useState(false);
  const [ticketError, setTicketError] = useState("");
  const [ticketReplyBody, setTicketReplyBody] = useState("");
  const [ticketReplySending, setTicketReplySending] = useState(false);

  // ---------------------------------------------------------------------------
  // Real-time: incoming messages
  // ---------------------------------------------------------------------------

  useRealtimeSubscription<Record<string, unknown>>(
    "messages",
    { column: "recipient_id", value: userId },
    useCallback(
      (newMsg: Record<string, unknown>) => {
        if (newMsg.sender_id === userId) return;
        const sender = members.find((m) => m.user_id === newMsg.sender_id);
        const senderName = sender?.full_name || sender?.email || "Team member";
        const newItem: InboxItem = {
          id: newMsg.id as string,
          kind: "message",
          title: (newMsg.subject as string) || t("inboxNoSubject"),
          preview: ((newMsg.body as string) || "").slice(0, 120),
          sender_name: senderName,
          is_read: false,
          created_at: newMsg.created_at as string,
          entity_type: null,
          entity_id: null,
          message: newMsg as unknown as InboxItem["message"],
        };
        setItems((prev) => {
          if (prev.some((i) => i.id === newItem.id)) return prev;
          return [newItem, ...prev];
        });
        setUnreadCount((prev) => prev + 1);
      },
      [userId, members, t]
    )
  );

  // Real-time: incoming notifications
  useRealtimeSubscription<Record<string, unknown>>(
    "notifications",
    { column: "user_id", value: userId },
    useCallback(
      (newNotif: Record<string, unknown>) => {
        const newItem: InboxItem = {
          id: newNotif.id as string,
          kind: "notification",
          title: (newNotif.title as string) || t("inboxNotification"),
          preview: ((newNotif.message as string) || "").slice(0, 120),
          sender_name: t("inboxSystem"),
          is_read: false,
          created_at: newNotif.created_at as string,
          entity_type: (newNotif.entity_type as string) || null,
          entity_id: (newNotif.entity_id as string) || null,
          notification: newNotif as unknown as InboxItem["notification"],
        };
        setItems((prev) => {
          if (prev.some((i) => i.id === newItem.id)) return prev;
          return [newItem, ...prev];
        });
        setUnreadCount((prev) => prev + 1);
      },
      [t]
    )
  );

  // ---------------------------------------------------------------------------
  // Filtered items
  // ---------------------------------------------------------------------------

  // Convert support tickets to InboxItems for the "all" tab
  const supportTicketItems: InboxItem[] = useMemo(
    () =>
      tickets.map((t) => ({
        id: `ticket-${t.id}`,
        kind: "support" as InboxItem["kind"],
        title: `#${t.ticket_number} ${t.subject}`,
        preview: t.description
          ? t.description.length > 120
            ? t.description.slice(0, 120) + "..."
            : t.description
          : "",
        sender_name: ticketStatusLabel(t.status),
        is_read: t.status === "resolved" || t.status === "closed",
        created_at: t.updated_at || t.created_at,
        entity_type: "support_ticket",
        entity_id: t.id,
      })),
    [tickets]
  );

  const filtered = useMemo(() => {
    // For announcements tab, use announcementItems only
    if (activeTab === "announcements") {
      let result = announcementItems;
      if (search.trim()) {
        const term = search.toLowerCase();
        result = result.filter(
          (i) =>
            i.title.toLowerCase().includes(term) ||
            i.preview.toLowerCase().includes(term)
        );
      }
      return result;
    }

    // Support tab handled separately (not via InboxItem filtering)
    if (activeTab === "support") {
      return [];
    }

    // For "all" tab, merge announcements and support tickets with regular items
    let result = activeTab === "all"
      ? [...items, ...announcementItems, ...supportTicketItems]
      : items;

    if (activeTab === "messages") {
      result = result.filter((i) => i.kind === "message");
    } else if (activeTab === "notifications") {
      result = result.filter((i) => i.kind === "notification");
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(
        (i) =>
          i.title.toLowerCase().includes(term) ||
          i.preview.toLowerCase().includes(term) ||
          (i.sender_name && i.sender_name.toLowerCase().includes(term))
      );
    }

    // Sort by date desc
    result.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return result;
  }, [items, announcementItems, supportTicketItems, activeTab, search]);

  const selectedItem = useMemo(
    () =>
      items.find((i) => i.id === selectedId) ??
      announcementItems.find((i) => i.id === selectedId) ??
      supportTicketItems.find((i) => i.id === selectedId) ??
      null,
    [items, announcementItems, supportTicketItems, selectedId]
  );

  // ---------------------------------------------------------------------------
  // Mark as read
  // ---------------------------------------------------------------------------

  const markAsRead = useCallback(
    async (item: InboxItem) => {
      if (item.is_read) return;

      try {
        if (item.kind === "message") {
          await fetch("/api/inbox/messages", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messageId: item.id, action: "read" }),
          });
        } else {
          await fetch("/api/inbox/notifications", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ notificationId: item.id }),
          });
        }

        // Update local state
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, is_read: true } : i))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error("Failed to mark as read:", err);
      }
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Select item
  // ---------------------------------------------------------------------------

  const handleSelectItem = useCallback(
    async (item: InboxItem) => {
      setSelectedId(item.id);
      setShowReply(false);
      setReplyBody("");
      markAsRead(item);

      // Load thread if it's a message
      if (item.kind === "message" && item.message) {
        setLoadingThread(true);
        try {
          const res = await fetch(
            `/api/inbox/messages?thread=${item.message.parent_message_id || item.id}`
          );
          if (res.ok) {
            const data = await res.json();
            setThread(data);
          }
        } catch (err) {
          console.error("Failed to load thread:", err);
        } finally {
          setLoadingThread(false);
        }
      } else {
        setThread([]);
      }
    },
    [markAsRead]
  );

  // ---------------------------------------------------------------------------
  // Archive
  // ---------------------------------------------------------------------------

  const handleArchive = useCallback(
    async (item: InboxItem) => {
      if (item.kind !== "message") return;

      try {
        await fetch("/api/inbox/messages", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId: item.id, action: "archive" }),
        });

        setItems((prev) => prev.filter((i) => i.id !== item.id));
        if (selectedId === item.id) {
          setSelectedId(null);
        }
        if (!item.is_read) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      } catch (err) {
        console.error("Failed to archive:", err);
      }
    },
    [selectedId]
  );

  // ---------------------------------------------------------------------------
  // Send message (compose)
  // ---------------------------------------------------------------------------

  const handleSendMessage = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!composeRecipient || !composeBody.trim()) return;

      setComposeSending(true);
      setComposeError("");

      try {
        const res = await fetch("/api/inbox/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient_id: composeRecipient,
            subject: composeSubject,
            body: composeBody,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setComposeError(data.error || t("inboxSendFailed"));
          return;
        }

        const newMessage = await res.json();

        // Find recipient name
        const recipientMember = members.find(
          (m) => m.user_id === composeRecipient
        );
        const recipientName =
          recipientMember?.full_name || recipientMember?.email || "Unknown";

        // Add to local items
        const newItem: InboxItem = {
          id: newMessage.id,
          kind: "message",
          title: composeSubject || t("inboxNoSubject"),
          preview:
            composeBody.length > 120
              ? composeBody.slice(0, 120) + "..."
              : composeBody,
          sender_name: `${t("inboxTo")}: ${recipientName}`,
          is_read: true,
          created_at: newMessage.created_at,
          entity_type: null,
          entity_id: null,
          message: newMessage,
        };

        setItems((prev) => [newItem, ...prev]);

        // Reset form
        setComposeRecipient("");
        setComposeSubject("");
        setComposeBody("");
        setShowCompose(false);
      } catch (err) {
        console.error("Failed to send message:", err);
        setComposeError(t("inboxUnexpectedError"));
      } finally {
        setComposeSending(false);
      }
    },
    [composeRecipient, composeSubject, composeBody, members, t]
  );

  // ---------------------------------------------------------------------------
  // Send reply
  // ---------------------------------------------------------------------------

  const handleSendReply = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedItem || !selectedItem.message || !replyBody.trim()) return;

      setReplySending(true);

      try {
        const parentMsg = selectedItem.message;
        // Reply goes to the other party in the conversation
        const replyRecipient =
          parentMsg.sender_id === userId
            ? parentMsg.recipient_id
            : parentMsg.sender_id;

        const res = await fetch("/api/inbox/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient_id: replyRecipient,
            subject: parentMsg.subject
              ? `Re: ${parentMsg.subject.replace(/^Re:\s*/i, "")}`
              : null,
            body: replyBody,
            parent_message_id:
              parentMsg.parent_message_id || parentMsg.id,
          }),
        });

        if (res.ok) {
          const newReply = await res.json();
          setThread((prev) => [...prev, newReply]);
          setReplyBody("");
          setShowReply(false);
        }
      } catch (err) {
        console.error("Failed to send reply:", err);
      } finally {
        setReplySending(false);
      }
    },
    [selectedItem, replyBody, userId]
  );

  // ---------------------------------------------------------------------------
  // Support ticket: select ticket
  // ---------------------------------------------------------------------------

  const handleSelectTicket = useCallback(
    async (ticket: UserSupportTicket) => {
      setSelectedTicketId(ticket.id);
      setSelectedId(null);
      setTicketReplyBody("");
      setLoadingTicketDetail(true);

      try {
        const res = await fetch(`/api/inbox/support-tickets/${ticket.id}`);
        if (res.ok) {
          const data = await res.json();
          setSelectedTicketDetail(data.ticket);
        }
      } catch (err) {
        console.error("Failed to load ticket detail:", err);
      } finally {
        setLoadingTicketDetail(false);
      }
    },
    []
  );

  // When clicking a support ticket from "all" tab (InboxItem)
  const handleSelectSupportItem = useCallback(
    (item: InboxItem) => {
      if (item.entity_id) {
        const ticket = tickets.find((t) => t.id === item.entity_id);
        if (ticket) {
          setActiveTab("support");
          handleSelectTicket(ticket);
        }
      }
    },
    [tickets, handleSelectTicket]
  );

  // ---------------------------------------------------------------------------
  // Support ticket: create
  // ---------------------------------------------------------------------------

  const handleCreateTicket = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!ticketSubject.trim() || !ticketDescription.trim()) return;

      setTicketCreating(true);
      setTicketError("");

      try {
        const res = await fetch("/api/inbox/support-tickets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: ticketSubject,
            description: ticketDescription,
            category: ticketCategory,
            priority: ticketPriority,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setTicketError(data.error || "Failed to create ticket");
          return;
        }

        const data = await res.json();
        if (data.ticket) {
          setTickets((prev) => [data.ticket, ...prev]);
        }

        // Reset form
        setTicketSubject("");
        setTicketDescription("");
        setTicketCategory("general");
        setTicketPriority("medium");
        setShowCreateTicket(false);
      } catch (err) {
        console.error("Failed to create ticket:", err);
        setTicketError("An unexpected error occurred");
      } finally {
        setTicketCreating(false);
      }
    },
    [ticketSubject, ticketDescription, ticketCategory, ticketPriority]
  );

  // ---------------------------------------------------------------------------
  // Support ticket: reply
  // ---------------------------------------------------------------------------

  const handleTicketReply = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedTicketId || !ticketReplyBody.trim()) return;

      setTicketReplySending(true);

      try {
        const res = await fetch(`/api/inbox/support-tickets/${selectedTicketId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: ticketReplyBody }),
        });

        if (res.ok) {
          // Refresh ticket detail
          const detailRes = await fetch(`/api/inbox/support-tickets/${selectedTicketId}`);
          if (detailRes.ok) {
            const data = await detailRes.json();
            setSelectedTicketDetail(data.ticket);
          }
          setTicketReplyBody("");
        }
      } catch (err) {
        console.error("Failed to send ticket reply:", err);
      } finally {
        setTicketReplySending(false);
      }
    },
    [selectedTicketId, ticketReplyBody]
  );

  // Filtered support tickets for the Support tab
  const filteredTickets = useMemo(() => {
    if (activeTab !== "support") return [];
    let result = tickets;
    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.subject.toLowerCase().includes(term) ||
          (t.description && t.description.toLowerCase().includes(term)) ||
          String(t.ticket_number).includes(term)
      );
    }
    return result;
  }, [tickets, activeTab, search]);

  // ---------------------------------------------------------------------------
  // Tab counts
  // ---------------------------------------------------------------------------

  const msgCount = items.filter((i) => i.kind === "message").length;
  const notifCount = items.filter((i) => i.kind === "notification").length;
  const annCount = announcementItems.length;
  const ticketCount = tickets.length;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="inbox-page">
      {/* Header */}
      <div className="inbox-header">
        <div>
          <h2>{t("inboxTitle")}</h2>
          <p className="inbox-header-sub">
            {unreadCount > 0
              ? t("inboxUnreadItems", { count: unreadCount })
              : t("inboxAllCaughtUp")}
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            if (activeTab === "support") {
              setShowCreateTicket(true);
              setTicketError("");
            } else {
              setShowCompose(true);
              setComposeError("");
            }
          }}
        >
          <Plus size={16} />
          {activeTab === "support" ? t("inboxNewTicket") : t("inboxCompose")}
        </button>
      </div>

      {/* Tabs */}
      <div className="inbox-tabs">
        <button
          className={`inbox-tab ${activeTab === "all" ? "active" : ""}`}
          onClick={() => setActiveTab("all")}
        >
          {t("inboxAll")}
          {items.length > 0 && (
            <span className="inbox-tab-count">{items.length}</span>
          )}
        </button>
        <button
          className={`inbox-tab ${activeTab === "messages" ? "active" : ""}`}
          onClick={() => setActiveTab("messages")}
        >
          <Mail size={14} />
          {t("inboxMessages")}
          {msgCount > 0 && (
            <span className="inbox-tab-count">{msgCount}</span>
          )}
        </button>
        <button
          className={`inbox-tab ${activeTab === "notifications" ? "active" : ""}`}
          onClick={() => setActiveTab("notifications")}
        >
          <Bell size={14} />
          {t("inboxNotifications")}
          {notifCount > 0 && (
            <span className="inbox-tab-count">{notifCount}</span>
          )}
        </button>
        <button
          className={`inbox-tab ${activeTab === "announcements" ? "active" : ""}`}
          onClick={() => setActiveTab("announcements")}
        >
          <Megaphone size={14} />
          {t("inboxAnnouncements")}
          {annCount > 0 && (
            <span className="inbox-tab-count">{annCount}</span>
          )}
        </button>
        <button
          className={`inbox-tab ${activeTab === "support" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("support");
            setSelectedId(null);
            setSelectedTicketId(null);
            setSelectedTicketDetail(null);
          }}
        >
          <Headphones size={14} />
          {t("inboxSupport")}
          {ticketCount > 0 && (
            <span className="inbox-tab-count">{ticketCount}</span>
          )}
        </button>
      </div>

      {/* Search */}
      <div className="inbox-search">
        <Search size={16} className="inbox-search-icon" />
        <input
          type="text"
          placeholder={t("inboxSearchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Two-panel layout */}
      <div className="inbox-layout">
        {/* Left: List */}
        <div className="inbox-list">
          {/* Support tab: show tickets */}
          {activeTab === "support" && (
            <>
              {filteredTickets.length === 0 && (
                <div className="inbox-empty">
                  <div className="inbox-empty-icon">
                    <Headphones size={28} />
                  </div>
                  <h3>{t("inboxNoItems")}</h3>
                  <p>
                    {search.trim()
                      ? t("inboxNoSearchResults")
                      : t("inboxNoSupportTickets")}
                  </p>
                </div>
              )}
              {filteredTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className={`inbox-item ${selectedTicketId === ticket.id ? "selected" : ""}`}
                  onClick={() => handleSelectTicket(ticket)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSelectTicket(ticket);
                  }}
                >
                  <div className="inbox-item-icon">
                    <Headphones size={16} />
                  </div>
                  <div className="inbox-item-content">
                    <div className="inbox-item-top">
                      <span className={ticketStatusClass(ticket.status)}>
                        {ticketStatusLabel(ticket.status)}
                      </span>
                      <span className="inbox-item-time">
                        {formatRelativeTime(ticket.updated_at || ticket.created_at, dateLocale)}
                      </span>
                    </div>
                    <div className="inbox-item-title">
                      #{ticket.ticket_number} {ticket.subject}
                    </div>
                    <div className="inbox-item-preview">
                      <span className="inbox-ticket-category-label">
                        {ticketCategoryLabel(ticket.category)}
                      </span>
                      {ticket.description && (
                        <> &middot; {ticket.description.length > 80
                          ? ticket.description.slice(0, 80) + "..."
                          : ticket.description}</>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Other tabs: show filtered InboxItems */}
          {activeTab !== "support" && (
            <>
              {filtered.length === 0 && (
                <div className="inbox-empty">
                  <div className="inbox-empty-icon">
                    <Inbox size={28} />
                  </div>
                  <h3>{t("inboxNoItems")}</h3>
                  <p>
                    {search.trim()
                      ? t("inboxNoSearchResults")
                      : activeTab === "messages"
                        ? t("inboxNoMessages")
                        : activeTab === "notifications"
                          ? t("inboxNoNotifications")
                          : activeTab === "announcements"
                            ? t("inboxNoAnnouncements")
                            : t("inboxEmpty")}
                  </p>
                </div>
              )}

              {filtered.map((item) => (
                <div
                  key={item.id}
                  className={`inbox-item ${!item.is_read ? "unread" : ""} ${selectedId === item.id ? "selected" : ""}`}
                  onClick={() => {
                    if (item.kind === "support") {
                      handleSelectSupportItem(item);
                    } else {
                      handleSelectItem(item);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (item.kind === "support") {
                        handleSelectSupportItem(item);
                      } else {
                        handleSelectItem(item);
                      }
                    }
                  }}
                >
                  <div className="inbox-item-icon">
                    {item.kind === "message" ? (
                      <Mail size={16} />
                    ) : item.kind === "announcement" ? (
                      <Megaphone size={16} />
                    ) : item.kind === "support" ? (
                      <Headphones size={16} />
                    ) : (
                      <Bell size={16} />
                    )}
                  </div>

                  <div className="inbox-item-content">
                    <div className="inbox-item-top">
                      <span className="inbox-item-sender">
                        {item.sender_name || t("inboxSystem")}
                      </span>
                      <span className="inbox-item-time">
                        {formatRelativeTime(item.created_at, dateLocale)}
                      </span>
                    </div>
                    <div className="inbox-item-title">{item.title}</div>
                    <div className="inbox-item-preview">{item.preview}</div>
                  </div>

                  {!item.is_read && <span className="inbox-item-dot" />}
                </div>
              ))}
            </>
          )}
        </div>

        {/* Right: Detail */}
        <div className="inbox-detail">
          {/* Support ticket detail (when on support tab) */}
          {activeTab === "support" && !selectedTicketId && (
            <div className="inbox-detail-empty">
              <Headphones size={40} />
              <p>{t("inboxSelectItem")}</p>
            </div>
          )}

          {activeTab === "support" && selectedTicketId && (
            <div className="inbox-detail-content">
              {loadingTicketDetail && (
                <div className="inbox-thread-loading">
                  {t("inboxLoadingConversation")}
                </div>
              )}

              {!loadingTicketDetail && selectedTicketDetail && (
                <>
                  <div className="inbox-detail-header">
                    <div className="inbox-detail-meta">
                      <span className={ticketStatusClass(selectedTicketDetail.status)}>
                        {ticketStatusLabel(selectedTicketDetail.status)}
                      </span>
                      <span className={ticketPriorityClass(selectedTicketDetail.priority)}>
                        {selectedTicketDetail.priority}
                      </span>
                      <span className="inbox-ticket-category-label">
                        {ticketCategoryLabel(selectedTicketDetail.category)}
                      </span>
                      <span className="inbox-detail-date">
                        {formatFullDate(selectedTicketDetail.created_at, dateLocale)}
                      </span>
                    </div>
                    <h3>#{selectedTicketDetail.ticket_number} {selectedTicketDetail.subject}</h3>
                  </div>

                  {selectedTicketDetail.description && (
                    <div className="inbox-detail-body" style={{ whiteSpace: "pre-wrap" }}>
                      {selectedTicketDetail.description}
                    </div>
                  )}

                  {/* Ticket message thread */}
                  <div className="inbox-thread">
                    {selectedTicketDetail.messages.length === 0 && (
                      <div className="inbox-thread-loading" style={{ color: "var(--color-text-muted)" }}>
                        {t("inboxNoMessages")}
                      </div>
                    )}
                    {selectedTicketDetail.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`inbox-thread-message ${msg.user_id === userId ? "sent" : "received"}`}
                      >
                        <div className="inbox-thread-message-header">
                          <strong>
                            {msg.user_id === userId
                              ? t("inboxYou")
                              : msg.user_full_name || msg.user_email || t("inboxSupportTeam")}
                          </strong>
                          <span className="inbox-thread-message-time">
                            {formatFullDate(msg.created_at, dateLocale)}
                          </span>
                        </div>
                        <div className="inbox-thread-message-body">
                          {msg.message}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Reply form for tickets (only if not resolved/closed) */}
                  {selectedTicketDetail.status !== "resolved" &&
                    selectedTicketDetail.status !== "closed" && (
                    <form className="inbox-reply-form" onSubmit={handleTicketReply}>
                      <textarea
                        className="inbox-reply-textarea"
                        placeholder={t("inboxTicketReplyPlaceholder")}
                        value={ticketReplyBody}
                        onChange={(e) => setTicketReplyBody(e.target.value)}
                        rows={4}
                      />
                      <div className="inbox-reply-actions">
                        <button
                          type="submit"
                          className="btn-primary"
                          disabled={ticketReplySending || !ticketReplyBody.trim()}
                        >
                          <Send size={14} />
                          {ticketReplySending ? t("inboxSending") : t("inboxSendReply")}
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}
            </div>
          )}

          {/* Regular detail views (non-support tabs) */}
          {activeTab !== "support" && !selectedItem && (
            <div className="inbox-detail-empty">
              <Mail size={40} />
              <p>{t("inboxSelectItem")}</p>
            </div>
          )}

          {activeTab !== "support" && selectedItem && selectedItem.kind === "notification" && (
            <div className="inbox-detail-content">
              <div className="inbox-detail-header">
                <div className="inbox-detail-meta">
                  <span
                    className={`inbox-type-badge inbox-type-${selectedItem.notification?.notification_type || "info"}`}
                  >
                    {selectedItem.notification?.notification_type || "info"}
                  </span>
                  <span className="inbox-detail-date">
                    {formatFullDate(selectedItem.created_at, dateLocale)}
                  </span>
                </div>
                <h3>{selectedItem.title}</h3>
              </div>
              <div className="inbox-detail-body">
                {selectedItem.notification?.message || t("inboxNoAdditionalDetails")}
              </div>
            </div>
          )}

          {activeTab !== "support" && selectedItem && selectedItem.kind === "announcement" && (
            <div className="inbox-detail-content">
              <div className="inbox-detail-header">
                <div className="inbox-detail-meta">
                  <span className="inbox-type-badge inbox-type-announcement">
                    {t("inboxAnnouncementLabel")}
                  </span>
                  <span className="inbox-detail-date">
                    {formatFullDate(selectedItem.created_at, dateLocale)}
                  </span>
                </div>
                <h3>{selectedItem.title}</h3>
                <div className="inbox-detail-participants">
                  <span>{t("inboxFrom")}: {t("inboxBuildwrkPlatform")}</span>
                  <span style={{ textTransform: "capitalize" }}>
                    {t("inboxAudience")}: {selectedItem.announcement?.target_audience || t("inboxAll")}
                  </span>
                </div>
              </div>
              <div className="inbox-detail-body" style={{ whiteSpace: "pre-wrap" }}>
                {selectedItem.announcement?.content || t("inboxNoAdditionalDetails")}
              </div>
            </div>
          )}

          {activeTab !== "support" && selectedItem && selectedItem.kind === "message" && (
            <div className="inbox-detail-content">
              <div className="inbox-detail-header">
                <div className="inbox-detail-meta">
                  <span className="inbox-type-badge inbox-type-message">
                    {t("inboxMessageLabel")}
                  </span>
                  <span className="inbox-detail-date">
                    {formatFullDate(selectedItem.created_at, dateLocale)}
                  </span>
                </div>
                <h3>{selectedItem.title}</h3>
                <div className="inbox-detail-participants">
                  <span>
                    {t("inboxFrom")}:{" "}
                    {selectedItem.message?.sender?.full_name ||
                      selectedItem.message?.sender?.email ||
                      "Unknown"}
                  </span>
                  <span>
                    {t("inboxTo")}:{" "}
                    {selectedItem.message?.recipient?.full_name ||
                      selectedItem.message?.recipient?.email ||
                      "Unknown"}
                  </span>
                </div>
              </div>

              {/* Thread */}
              <div className="inbox-thread">
                {loadingThread && (
                  <div className="inbox-thread-loading">
                    {t("inboxLoadingConversation")}
                  </div>
                )}

                {!loadingThread && thread.length > 0 && (
                  <>
                    {thread.map((msg) => (
                      <div
                        key={msg.id}
                        className={`inbox-thread-message ${msg.sender_id === userId ? "sent" : "received"}`}
                      >
                        <div className="inbox-thread-message-header">
                          <strong>
                            {msg.sender_id === userId
                              ? t("inboxYou")
                              : msg.sender?.full_name ||
                                msg.sender?.email ||
                                "Unknown"}
                          </strong>
                          <span className="inbox-thread-message-time">
                            {formatFullDate(msg.created_at, dateLocale)}
                          </span>
                        </div>
                        <div className="inbox-thread-message-body">
                          {msg.body}
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {!loadingThread && thread.length === 0 && selectedItem.message && (
                  <div className="inbox-thread-message received">
                    <div className="inbox-thread-message-header">
                      <strong>
                        {selectedItem.message.sender_id === userId
                          ? t("inboxYou")
                          : selectedItem.message.sender?.full_name ||
                            selectedItem.message.sender?.email ||
                            "Unknown"}
                      </strong>
                      <span className="inbox-thread-message-time">
                        {formatFullDate(selectedItem.created_at, dateLocale)}
                      </span>
                    </div>
                    <div className="inbox-thread-message-body">
                      {selectedItem.message.body}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="inbox-detail-actions">
                <button
                  className="inbox-action-btn"
                  onClick={() => setShowReply(!showReply)}
                  title={t("inboxReply")}
                >
                  <Reply size={16} />
                  {t("inboxReply")}
                </button>
                <button
                  className="inbox-action-btn"
                  onClick={() => handleArchive(selectedItem)}
                  title={t("inboxArchive")}
                >
                  <Archive size={16} />
                  {t("inboxArchive")}
                </button>
              </div>

              {/* Reply form */}
              {showReply && (
                <form className="inbox-reply-form" onSubmit={handleSendReply}>
                  <textarea
                    className="inbox-reply-textarea"
                    placeholder={t("inboxReplyPlaceholder")}
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    rows={4}
                    autoFocus
                  />
                  <div className="inbox-reply-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setShowReply(false);
                        setReplyBody("");
                      }}
                    >
                      {t("cancel")}
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={replySending || !replyBody.trim()}
                    >
                      <Send size={14} />
                      {replySending ? t("inboxSending") : t("inboxSendReply")}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div
          className="inbox-compose-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCompose(false);
          }}
        >
          <div className="inbox-compose">
            <div className="inbox-compose-header">
              <h3>{t("inboxNewMessage")}</h3>
              <button
                className="inbox-compose-close"
                onClick={() => setShowCompose(false)}
                title={t("inboxClose")}
              >
                <X size={18} />
              </button>
            </div>

            {composeError && (
              <div className="form-error">{composeError}</div>
            )}

            <form onSubmit={handleSendMessage}>
              <div className="inbox-compose-field">
                <label className="form-label" htmlFor="compose-recipient">
                  {t("inboxTo")}
                </label>
                <select
                  id="compose-recipient"
                  className="form-select"
                  value={composeRecipient}
                  onChange={(e) => setComposeRecipient(e.target.value)}
                  required
                >
                  <option value="">{t("inboxSelectRecipient")}</option>
                  {members
                    .filter((m) => m.user_id !== userId)
                    .map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.full_name || m.email || m.user_id} ({m.role})
                      </option>
                    ))}
                </select>
              </div>

              <div className="inbox-compose-field">
                <label className="form-label" htmlFor="compose-subject">
                  {t("inboxSubject")}
                </label>
                <input
                  id="compose-subject"
                  className="form-input"
                  type="text"
                  placeholder={t("inboxSubjectPlaceholder")}
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                />
              </div>

              <div className="inbox-compose-field">
                <label className="form-label" htmlFor="compose-body">
                  {t("inboxMessageFieldLabel")}
                </label>
                <textarea
                  id="compose-body"
                  className="form-textarea"
                  placeholder={t("inboxMessagePlaceholder")}
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  rows={8}
                  required
                />
              </div>

              <div className="inbox-compose-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCompose(false)}
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={composeSending || !composeRecipient || !composeBody.trim()}
                >
                  <Send size={14} />
                  {composeSending ? t("inboxSending") : t("inboxSendMessage")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Ticket Modal */}
      {showCreateTicket && (
        <div
          className="inbox-compose-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateTicket(false);
          }}
        >
          <div className="inbox-compose">
            <div className="inbox-compose-header">
              <h3>{t("inboxNewTicket")}</h3>
              <button
                className="inbox-compose-close"
                onClick={() => setShowCreateTicket(false)}
                title={t("inboxClose")}
              >
                <X size={18} />
              </button>
            </div>

            {ticketError && (
              <div className="form-error">{ticketError}</div>
            )}

            <form onSubmit={handleCreateTicket}>
              <div className="inbox-compose-field">
                <label className="form-label" htmlFor="ticket-subject">
                  {t("inboxTicketSubject")}
                </label>
                <input
                  id="ticket-subject"
                  className="form-input"
                  type="text"
                  placeholder={t("inboxTicketSubjectPlaceholder")}
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  required
                />
              </div>

              <div className="inbox-compose-field">
                <label className="form-label" htmlFor="ticket-category">
                  {t("inboxTicketCategory")}
                </label>
                <select
                  id="ticket-category"
                  className="form-select"
                  value={ticketCategory}
                  onChange={(e) => setTicketCategory(e.target.value)}
                >
                  <option value="general">General</option>
                  <option value="billing">Billing</option>
                  <option value="technical">Technical</option>
                  <option value="feature_request">Feature Request</option>
                  <option value="bug_report">Bug Report</option>
                  <option value="account">Account</option>
                </select>
              </div>

              <div className="inbox-compose-field">
                <label className="form-label" htmlFor="ticket-priority">
                  {t("inboxTicketPriority")}
                </label>
                <select
                  id="ticket-priority"
                  className="form-select"
                  value={ticketPriority}
                  onChange={(e) => setTicketPriority(e.target.value)}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div className="inbox-compose-field">
                <label className="form-label" htmlFor="ticket-description">
                  {t("inboxTicketDescription")}
                </label>
                <textarea
                  id="ticket-description"
                  className="form-textarea"
                  placeholder={t("inboxTicketDescriptionPlaceholder")}
                  value={ticketDescription}
                  onChange={(e) => setTicketDescription(e.target.value)}
                  rows={8}
                  required
                />
              </div>

              <div className="inbox-compose-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreateTicket(false)}
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={ticketCreating || !ticketSubject.trim() || !ticketDescription.trim()}
                >
                  <Send size={14} />
                  {ticketCreating ? t("inboxSending") : t("inboxSubmitTicket")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
