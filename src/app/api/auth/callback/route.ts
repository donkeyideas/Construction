import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { extractRequestMeta } from "@/lib/utils/audit-logger";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next"); // null when no explicit redirect

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Track OAuth login (fire-and-forget)
      if (data?.user) {
        trackOAuthLogin(supabase, data.user, request).catch(() => {});
      }

      // If an explicit redirect was provided, use it
      if (next) {
        return NextResponse.redirect(`${origin}${next}`);
      }

      // Otherwise determine the correct dashboard from user profile
      if (data?.user) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("portal_type, is_platform_admin")
          .eq("id", data.user.id)
          .single();

        if (profile?.is_platform_admin) {
          return NextResponse.redirect(`${origin}/super-admin`);
        }
        if (profile?.portal_type === "tenant") {
          return NextResponse.redirect(`${origin}/tenant`);
        }
        if (profile?.portal_type === "vendor") {
          return NextResponse.redirect(`${origin}/vendor`);
        }
        if (profile?.portal_type === "admin") {
          return NextResponse.redirect(`${origin}/admin-panel`);
        }
      }

      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function trackOAuthLogin(supabase: any, user: { id: string; email?: string }, request: Request) {
  const { ipAddress, userAgent } = extractRequestMeta(request);
  const email = user.email || "";

  const { data: membership } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!membership) return;

  const companyId = membership.company_id;

  await Promise.all([
    supabase.from("login_history").insert({
      company_id: companyId,
      user_id: user.id,
      email,
      ip_address: ipAddress,
      user_agent: userAgent,
      status: "success",
      login_at: new Date().toISOString(),
    }),
    supabase.from("active_sessions").insert({
      company_id: companyId,
      user_id: user.id,
      session_token: crypto.randomUUID(),
      ip_address: ipAddress,
      user_agent: userAgent,
      last_active_at: new Date().toISOString(),
      is_current: true,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }),
    supabase.from("audit_logs").insert({
      company_id: companyId,
      user_id: user.id,
      action: "user_login_oauth",
      entity_type: "user",
      entity_id: user.id,
      details: { email, ip_address: ipAddress, provider: "google" },
    }),
  ]);
}
