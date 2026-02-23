import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/queries/super-admin";
import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// GET /api/super-admin/users/[id]/analytics
// Returns usage analytics for a specific user (platform admin only)
// ---------------------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const isAdmin = await isPlatformAdmin(supabase);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id: userId } = await params;
    const admin = createAdminClient();

    // Fetch all data in parallel
    const [
      loginResult,
      auditResult,
      memberResult,
      lastLoginResult,
    ] = await Promise.all([
      // Total login count
      admin
        .from("login_history")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      // Total audit log actions
      admin
        .from("audit_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      // User's company memberships
      admin
        .from("company_members")
        .select("company_id, role, is_active")
        .eq("user_id", userId)
        .eq("is_active", true),
      // Last login
      admin
        .from("login_history")
        .select("login_at, ip_address, user_agent")
        .eq("user_id", userId)
        .order("login_at", { ascending: false })
        .limit(1),
    ]);

    const totalLogins = loginResult.count ?? 0;
    const totalActions = auditResult.count ?? 0;
    const lastLogin = lastLoginResult.data?.[0] ?? null;
    const companyIds = (memberResult.data ?? []).map((m) => m.company_id);

    // Fetch company-specific analytics
    let companyAnalytics: Record<string, {
      subscription_plan: string;
      subscription_status: string;
      subscription_ends_at: string | null;
      projects: number;
      invoices: number;
      contacts: number;
      documents: number;
    }> = {};

    if (companyIds.length > 0) {
      const [projectsResult, invoicesResult, contactsResult, documentsResult, companiesResult] =
        await Promise.all([
          admin
            .from("projects")
            .select("id, company_id", { count: "exact", head: false })
            .in("company_id", companyIds),
          admin
            .from("invoices")
            .select("id, company_id", { count: "exact", head: false })
            .in("company_id", companyIds),
          admin
            .from("contacts")
            .select("id, company_id", { count: "exact", head: false })
            .in("company_id", companyIds),
          admin
            .from("documents")
            .select("id, company_id", { count: "exact", head: false })
            .in("company_id", companyIds),
          admin
            .from("companies")
            .select("id, subscription_plan, subscription_status, subscription_ends_at")
            .in("id", companyIds),
        ]);

      // Build per-company counts
      for (const cid of companyIds) {
        const company = (companiesResult.data ?? []).find((c) => c.id === cid);
        companyAnalytics[cid] = {
          subscription_plan: company?.subscription_plan ?? "starter",
          subscription_status: company?.subscription_status ?? "active",
          subscription_ends_at: company?.subscription_ends_at ?? null,
          projects: (projectsResult.data ?? []).filter((p) => p.company_id === cid).length,
          invoices: (invoicesResult.data ?? []).filter((i) => i.company_id === cid).length,
          contacts: (contactsResult.data ?? []).filter((c) => c.company_id === cid).length,
          documents: (documentsResult.data ?? []).filter((d) => d.company_id === cid).length,
        };
      }
    }

    // Recent activity (last 10 audit log entries)
    const { data: recentActivity } = await admin
      .from("audit_logs")
      .select("action, entity_type, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    // Login frequency (logins per week for last 4 weeks)
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const { data: recentLogins } = await admin
      .from("login_history")
      .select("login_at")
      .eq("user_id", userId)
      .gte("login_at", fourWeeksAgo.toISOString())
      .order("login_at", { ascending: false });

    // Calculate weekly login counts
    const weeklyLogins: number[] = [0, 0, 0, 0]; // [this week, last week, 2 weeks ago, 3 weeks ago]
    const now = new Date();
    for (const login of recentLogins ?? []) {
      const daysAgo = Math.floor((now.getTime() - new Date(login.login_at).getTime()) / (1000 * 60 * 60 * 24));
      const weekIndex = Math.min(Math.floor(daysAgo / 7), 3);
      weeklyLogins[weekIndex]++;
    }

    return NextResponse.json({
      totalLogins,
      totalActions,
      lastLogin: lastLogin ? {
        at: lastLogin.login_at,
        ip: lastLogin.ip_address,
        userAgent: lastLogin.user_agent,
      } : null,
      companyAnalytics,
      recentActivity: (recentActivity ?? []).map((a) => ({
        action: a.action,
        entityType: a.entity_type,
        createdAt: a.created_at,
      })),
      weeklyLogins,
      loginsLast28Days: (recentLogins ?? []).length,
    });
  } catch (err) {
    console.error("GET /api/super-admin/users/[id]/analytics error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
