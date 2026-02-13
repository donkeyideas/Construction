import { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Message {
  id: string;
  company_id: string;
  sender_id: string;
  recipient_id: string;
  subject: string | null;
  body: string;
  parent_message_id: string | null;
  is_read: boolean;
  read_at: string | null;
  is_archived: boolean;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  sender?: { full_name: string | null; email: string | null } | null;
  recipient?: { full_name: string | null; email: string | null } | null;
  reply_count?: number;
}

export interface Notification {
  id: string;
  company_id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: string;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export type InboxItemKind = "message" | "notification";

export interface InboxItem {
  id: string;
  kind: InboxItemKind;
  title: string;
  preview: string;
  sender_name: string | null;
  is_read: boolean;
  created_at: string;
  entity_type: string | null;
  entity_id: string | null;
  // Original data for detail view
  message?: Message;
  notification?: Notification;
}

export interface CompanyMember {
  user_id: string;
  role: string;
  full_name: string | null;
  email: string | null;
}

export interface SendMessageData {
  company_id: string;
  sender_id: string;
  recipient_id: string;
  subject?: string;
  body: string;
  parent_message_id?: string;
  entity_type?: string;
  entity_id?: string;
}

// ---------------------------------------------------------------------------
// getInboxItems — merge notifications + messages into a unified list
// ---------------------------------------------------------------------------

export async function getInboxItems(
  supabase: SupabaseClient,
  companyId: string,
  userId: string
): Promise<InboxItem[]> {
  const [messages, notifications] = await Promise.all([
    getMessages(supabase, companyId, userId),
    getNotifications(supabase, companyId, userId),
  ]);

  const items: InboxItem[] = [];

  // Convert messages to inbox items (only show top-level messages, not replies)
  for (const msg of messages) {
    if (msg.parent_message_id) continue; // skip replies in unified list
    const senderName =
      msg.sender?.full_name || msg.sender?.email || "Unknown";
    const isIncoming = msg.recipient_id === userId;

    items.push({
      id: msg.id,
      kind: "message",
      title: msg.subject || "(No subject)",
      preview: msg.body.length > 120 ? msg.body.slice(0, 120) + "..." : msg.body,
      sender_name: isIncoming ? senderName : `To: ${msg.recipient?.full_name || msg.recipient?.email || "Unknown"}`,
      is_read: isIncoming ? msg.is_read : true, // Sent messages are always "read"
      created_at: msg.created_at,
      entity_type: msg.entity_type,
      entity_id: msg.entity_id,
      message: msg,
    });
  }

  // Convert notifications to inbox items
  for (const notif of notifications) {
    items.push({
      id: notif.id,
      kind: "notification",
      title: notif.title,
      preview: notif.body
        ? notif.body.length > 120
          ? notif.body.slice(0, 120) + "..."
          : notif.body
        : "",
      sender_name: null,
      is_read: notif.is_read,
      created_at: notif.created_at,
      entity_type: notif.entity_type,
      entity_id: notif.entity_id,
      notification: notif,
    });
  }

  // Sort by date desc
  items.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return items;
}

// ---------------------------------------------------------------------------
// getUnreadCount — count of unread messages + notifications
// ---------------------------------------------------------------------------

export async function getUnreadCount(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const [msgResult, notifResult] = await Promise.all([
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", userId)
      .eq("is_read", false)
      .eq("is_archived", false),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false),
  ]);

  return (msgResult.count ?? 0) + (notifResult.count ?? 0);
}

// ---------------------------------------------------------------------------
// getMessages — list messages where user is recipient or sender
// ---------------------------------------------------------------------------

export async function getMessages(
  supabase: SupabaseClient,
  companyId: string,
  userId: string
): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select(
      "*, sender:user_profiles!messages_sender_id_fkey(full_name, email), recipient:user_profiles!messages_recipient_id_fkey(full_name, email)"
    )
    .eq("company_id", companyId)
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .eq("is_archived", false)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("getMessages error:", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    ...row,
    sender: row.sender as unknown as {
      full_name: string | null;
      email: string | null;
    } | null,
    recipient: row.recipient as unknown as {
      full_name: string | null;
      email: string | null;
    } | null,
  }));
}

// ---------------------------------------------------------------------------
// getNotifications — list notifications for user
// ---------------------------------------------------------------------------

export async function getNotifications(
  supabase: SupabaseClient,
  companyId: string,
  userId: string
): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("getNotifications error:", error);
    return [];
  }

  return data ?? [];
}

// ---------------------------------------------------------------------------
// getMessageThread — get a message and its replies
// ---------------------------------------------------------------------------

export async function getMessageThread(
  supabase: SupabaseClient,
  messageId: string
): Promise<Message[]> {
  // Get the parent message and all replies
  const { data, error } = await supabase
    .from("messages")
    .select(
      "*, sender:user_profiles!messages_sender_id_fkey(full_name, email), recipient:user_profiles!messages_recipient_id_fkey(full_name, email)"
    )
    .or(`id.eq.${messageId},parent_message_id.eq.${messageId}`)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getMessageThread error:", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    ...row,
    sender: row.sender as unknown as {
      full_name: string | null;
      email: string | null;
    } | null,
    recipient: row.recipient as unknown as {
      full_name: string | null;
      email: string | null;
    } | null,
  }));
}

// ---------------------------------------------------------------------------
// sendMessage — insert a new message
// ---------------------------------------------------------------------------

export async function sendMessage(
  supabase: SupabaseClient,
  data: SendMessageData
): Promise<{ message: Message | null; error: string | null }> {
  const { data: result, error } = await supabase
    .from("messages")
    .insert({
      company_id: data.company_id,
      sender_id: data.sender_id,
      recipient_id: data.recipient_id,
      subject: data.subject || null,
      body: data.body,
      parent_message_id: data.parent_message_id || null,
      entity_type: data.entity_type || null,
      entity_id: data.entity_id || null,
    })
    .select()
    .single();

  if (error) {
    return { message: null, error: error.message };
  }

  return { message: result, error: null };
}

// ---------------------------------------------------------------------------
// markMessageRead — set is_read=true, read_at=now()
// ---------------------------------------------------------------------------

export async function markMessageRead(
  supabase: SupabaseClient,
  messageId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("messages")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", messageId);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

// ---------------------------------------------------------------------------
// markNotificationRead — set is_read=true, read_at=now()
// ---------------------------------------------------------------------------

export async function markNotificationRead(
  supabase: SupabaseClient,
  notificationId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", notificationId);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

// ---------------------------------------------------------------------------
// archiveMessage — set is_archived=true
// ---------------------------------------------------------------------------

export async function archiveMessage(
  supabase: SupabaseClient,
  messageId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("messages")
    .update({ is_archived: true, updated_at: new Date().toISOString() })
    .eq("id", messageId);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

// ---------------------------------------------------------------------------
// getCompanyMembers — get company members for compose recipient dropdown
// ---------------------------------------------------------------------------

export async function getCompanyMembers(
  supabase: SupabaseClient,
  companyId: string
): Promise<CompanyMember[]> {
  const { data, error } = await supabase
    .from("company_members")
    .select("user_id, role, user_profiles(full_name, email)")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("role", { ascending: true });

  if (error) {
    console.error("getCompanyMembers error:", error);
    return [];
  }

  return (data ?? []).map((row) => {
    const profile = row.user_profiles as unknown as {
      full_name: string | null;
      email: string | null;
    } | null;

    return {
      user_id: row.user_id,
      role: row.role,
      full_name: profile?.full_name ?? null,
      email: profile?.email ?? null,
    };
  });
}
