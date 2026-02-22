import { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export type NotificationType = "info" | "approval" | "alert" | "system";

export interface CreateNotificationParams {
  companyId: string;
  actorUserId: string;
  title: string;
  message?: string;
  notificationType: NotificationType;
  entityType?: string;
  entityId?: string;
  recipientUserIds?: string[];
}

/**
 * Create notifications for company members after a mutation.
 * Fire-and-forget — callers should wrap in try/catch.
 *
 * If recipientUserIds is not provided, notifies all active company members
 * except the actor.
 */
export async function createNotifications(
  supabase: SupabaseClient,
  params: CreateNotificationParams
): Promise<void> {
  const {
    companyId,
    actorUserId,
    title,
    message,
    notificationType,
    entityType,
    entityId,
    recipientUserIds,
  } = params;

  let userIds: string[];

  if (recipientUserIds && recipientUserIds.length > 0) {
    userIds = recipientUserIds.filter((id) => id !== actorUserId);
  } else {
    const { data: members } = await supabase
      .from("company_members")
      .select("user_id")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .neq("user_id", actorUserId);

    userIds = (members ?? []).map((m) => m.user_id);
  }

  if (userIds.length === 0) return;

  const rows = userIds.map((uid) => ({
    company_id: companyId,
    user_id: uid,
    title,
    message: message || null,
    notification_type: notificationType,
    entity_type: entityType || null,
    entity_id: entityId || null,
  }));

  const { error } = await supabase.from("notifications").insert(rows);

  if (error) {
    console.error("createNotifications error:", error);
  }
}

/**
 * Create notifications for ALL active users across ALL companies.
 * Used for platform-wide announcements. Uses the admin (service-role)
 * client to bypass RLS.
 */
export async function createPlatformNotifications(params: {
  actorUserId: string;
  title: string;
  message?: string;
  entityType?: string;
  entityId?: string;
}): Promise<void> {
  const { actorUserId, title, message, entityType, entityId } = params;
  const admin = createAdminClient();

  // Get all active company_members (distinct user_id + company_id pairs)
  const { data: members, error: fetchErr } = await admin
    .from("company_members")
    .select("user_id, company_id")
    .eq("is_active", true)
    .neq("user_id", actorUserId);

  if (fetchErr || !members || members.length === 0) {
    if (fetchErr) console.error("createPlatformNotifications fetch error:", fetchErr);
    return;
  }

  const rows = members.map((m) => ({
    company_id: m.company_id,
    user_id: m.user_id,
    title,
    message: message || null,
    notification_type: "system" as const,
    entity_type: entityType || null,
    entity_id: entityId || null,
  }));

  const { error } = await admin.from("notifications").insert(rows);

  if (error) {
    console.error("createPlatformNotifications insert error:", error);
  }
}
