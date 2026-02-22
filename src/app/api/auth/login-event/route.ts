import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractRequestMeta } from "@/lib/utils/audit-logger";

/**
 * POST /api/auth/login-event
 *
 * Records a login attempt in login_history, and on success also creates
 * an active_sessions row and an audit_log entry.
 *
 * Body: { status: "success" | "failed", email: string, failureReason?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { status, email, failureReason } = await request.json();
    const { ipAddress, userAgent } = extractRequestMeta(request);

    if (status === "success") {
      return handleSuccessLogin(email, ipAddress, userAgent);
    } else {
      return handleFailedLogin(email, ipAddress, userAgent, failureReason);
    }
  } catch (err) {
    console.error("[login-event] error:", err);
    return NextResponse.json({ ok: true }); // Never block the caller
  }
}

async function handleSuccessLogin(
  email: string,
  ipAddress: string,
  userAgent: string
) {
  const supabase = await createClient();

  // Get current user from session
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, reason: "no_session" });
  }

  // Look up their company
  const { data: membership } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ ok: false, reason: "no_company" });
  }

  const companyId = membership.company_id;

  // Insert login_history
  await supabase.from("login_history").insert({
    company_id: companyId,
    user_id: user.id,
    email,
    ip_address: ipAddress,
    user_agent: userAgent,
    status: "success",
    login_at: new Date().toISOString(),
  });

  // Insert active_session
  const sessionToken = crypto.randomUUID();
  await supabase.from("active_sessions").insert({
    company_id: companyId,
    user_id: user.id,
    session_token: sessionToken,
    ip_address: ipAddress,
    user_agent: userAgent,
    last_active_at: new Date().toISOString(),
    is_current: true,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
  });

  // Insert audit_log
  await supabase.from("audit_log").insert({
    company_id: companyId,
    user_id: user.id,
    action: "user_login",
    entity_type: "user",
    entity_id: user.id,
    details: { email, ip_address: ipAddress },
  });

  return NextResponse.json({ ok: true });
}

async function handleFailedLogin(
  email: string,
  ipAddress: string,
  userAgent: string,
  failureReason?: string
) {
  // Use admin client to bypass RLS (user is not authenticated)
  const admin = createAdminClient();

  // Try to find the user by email to get their company
  const { data: profile } = await admin
    .from("user_profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  let companyId: string | null = null;
  if (profile) {
    const { data: membership } = await admin
      .from("company_members")
      .select("company_id")
      .eq("user_id", profile.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    companyId = membership?.company_id ?? null;
  }

  // Only insert if we can determine the company (otherwise we have no context)
  if (companyId) {
    await admin.from("login_history").insert({
      company_id: companyId,
      user_id: profile?.id ?? null,
      email,
      ip_address: ipAddress,
      user_agent: userAgent,
      status: "failed",
      failure_reason: failureReason || "invalid_credentials",
      login_at: new Date().toISOString(),
    });
  }

  return NextResponse.json({ ok: true });
}
