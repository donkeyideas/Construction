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
} from "lucide-react";
import type { InboxItem, CompanyMember, Message, PlatformAnnouncement } from "@/lib/queries/inbox";

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

type TabFilter = "all" | "messages" | "notifications" | "announcements";

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
}

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
}: InboxClientProps) {
  const t = useTranslations("app");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

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
          preview: ((newNotif.body as string) || "").slice(0, 120),
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

    // For "all" tab, merge announcements with regular items
    let result = activeTab === "all" ? [...items, ...announcementItems] : items;

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
  }, [items, announcementItems, activeTab, search]);

  const selectedItem = useMemo(
    () =>
      items.find((i) => i.id === selectedId) ??
      announcementItems.find((i) => i.id === selectedId) ??
      null,
    [items, announcementItems, selectedId]
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
  // Tab counts
  // ---------------------------------------------------------------------------

  const msgCount = items.filter((i) => i.kind === "message").length;
  const notifCount = items.filter((i) => i.kind === "notification").length;
  const annCount = announcementItems.length;

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
            setShowCompose(true);
            setComposeError("");
          }}
        >
          <Plus size={16} />
          {t("inboxCompose")}
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
              onClick={() => handleSelectItem(item)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSelectItem(item);
              }}
            >
              <div className="inbox-item-icon">
                {item.kind === "message" ? (
                  <Mail size={16} />
                ) : item.kind === "announcement" ? (
                  <Megaphone size={16} />
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
        </div>

        {/* Right: Detail */}
        <div className="inbox-detail">
          {!selectedItem && (
            <div className="inbox-detail-empty">
              <Mail size={40} />
              <p>{t("inboxSelectItem")}</p>
            </div>
          )}

          {selectedItem && selectedItem.kind === "notification" && (
            <div className="inbox-detail-content">
              <div className="inbox-detail-header">
                <div className="inbox-detail-meta">
                  <span
                    className={`inbox-type-badge inbox-type-${selectedItem.notification?.type || "info"}`}
                  >
                    {selectedItem.notification?.type || "info"}
                  </span>
                  <span className="inbox-detail-date">
                    {formatFullDate(selectedItem.created_at, dateLocale)}
                  </span>
                </div>
                <h3>{selectedItem.title}</h3>
              </div>
              <div className="inbox-detail-body">
                {selectedItem.notification?.body || t("inboxNoAdditionalDetails")}
              </div>
              {selectedItem.entity_type && (
                <div className="inbox-detail-entity">
                  {t("inboxRelated")}: {selectedItem.entity_type}
                  {selectedItem.entity_id
                    ? ` (${selectedItem.entity_id.slice(0, 8)}...)`
                    : ""}
                </div>
              )}
            </div>
          )}

          {selectedItem && selectedItem.kind === "announcement" && (
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

          {selectedItem && selectedItem.kind === "message" && (
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
    </div>
  );
}
