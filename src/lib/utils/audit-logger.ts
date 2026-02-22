import type { SupabaseClient } from "@supabase/supabase-js";

interface LogAuditEventParams {
  supabase: SupabaseClient;
  companyId: string;
  userId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * Fire-and-forget insert into audit_log. Silently catches errors so it
 * never blocks the caller.
 */
export async function logAuditEvent({
  supabase,
  companyId,
  userId,
  action,
  entityType,
  entityId,
  details,
  ipAddress,
}: LogAuditEventParams): Promise<void> {
  try {
    await supabase.from("audit_log").insert({
      company_id: companyId,
      user_id: userId,
      action,
      entity_type: entityType ?? null,
      entity_id: entityId ?? null,
      details: details ?? {},
      ip_address: ipAddress ?? null,
    });
  } catch (err) {
    console.error("[audit-logger] Failed to write audit event:", err);
  }
}

/**
 * Extract IP address and user-agent from an incoming request.
 */
export function extractRequestMeta(request: Request): {
  ipAddress: string;
  userAgent: string;
} {
  const forwarded = request.headers.get("x-forwarded-for");
  const ipAddress = forwarded?.split(",")[0]?.trim() || "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";
  return { ipAddress, userAgent };
}
