import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/queries/super-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// CSV helper
// ---------------------------------------------------------------------------

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";

  const headers = Object.keys(rows[0]);

  function escapeField(value: unknown): string {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  const headerLine = headers.map(escapeField).join(",");
  const dataLines = rows.map((row) =>
    headers.map((h) => escapeField(row[h])).join(",")
  );

  return [headerLine, ...dataLines].join("\n");
}

// ---------------------------------------------------------------------------
// Export handlers per type
// ---------------------------------------------------------------------------

async function exportCompanies(): Promise<Record<string, unknown>[]> {
  const supabase = createAdminClient();

  const { data: companies, error } = await supabase
    .from("companies")
    .select("id, name, subscription_plan, industry_type, created_at")
    .order("created_at", { ascending: false });

  if (error || !companies) return [];

  // Fetch counts
  const [membersRes, projectsRes, propertiesRes] = await Promise.all([
    supabase.from("company_members").select("company_id"),
    supabase.from("projects").select("company_id"),
    supabase.from("properties").select("company_id"),
  ]);

  function countMap(data: { company_id: string }[] | null): Record<string, number> {
    const map: Record<string, number> = {};
    if (!data) return map;
    for (const row of data) {
      map[row.company_id] = (map[row.company_id] || 0) + 1;
    }
    return map;
  }

  const memberCounts = countMap(membersRes.data);
  const projectCounts = countMap(projectsRes.data);
  const propertyCounts = countMap(propertiesRes.data);

  return companies.map((c) => ({
    id: c.id,
    name: c.name,
    plan: c.subscription_plan,
    industry_type: c.industry_type || "",
    created_at: c.created_at,
    user_count: memberCounts[c.id] || 0,
    project_count: projectCounts[c.id] || 0,
    property_count: propertyCounts[c.id] || 0,
  }));
}

async function exportUsers(): Promise<Record<string, unknown>[]> {
  const supabase = createAdminClient();

  const { data: profiles, error } = await supabase
    .from("user_profiles")
    .select("id, full_name, email, portal_type, is_platform_admin, created_at")
    .order("created_at", { ascending: false });

  if (error || !profiles) return [];

  // Fetch company memberships
  const { data: members } = await supabase
    .from("company_members")
    .select("user_id, companies(name)");

  const userCompanyMap: Record<string, string> = {};
  if (members) {
    for (const m of members) {
      const companyName = (m.companies as unknown as { name: string } | null)?.name ?? "";
      if (!userCompanyMap[m.user_id]) {
        userCompanyMap[m.user_id] = companyName;
      }
    }
  }

  return profiles.map((p) => ({
    id: p.id,
    full_name: p.full_name || "",
    email: p.email,
    portal_type: p.portal_type || "",
    is_platform_admin: p.is_platform_admin ? "Yes" : "No",
    created_at: p.created_at,
    company_name: userCompanyMap[p.id] || "",
  }));
}

async function exportRevenue(): Promise<Record<string, unknown>[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("subscription_events")
    .select("company_id, event_type, plan_from, plan_to, amount, created_at, companies(name)")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((e) => {
    const company = e.companies as unknown as { name: string } | null;
    return {
      company_name: company?.name || "",
      event_type: e.event_type,
      plan: e.plan_to || e.plan_from || "",
      amount: e.amount ?? "",
      created_at: e.created_at,
    };
  });
}

async function exportTickets(): Promise<Record<string, unknown>[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("support_tickets")
    .select(
      "ticket_number, subject, status, priority, category, created_at, user_id, company_id"
    )
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  // Batch-fetch user emails and company names
  const exportUserIds = [...new Set(data.map((t) => t.user_id).filter(Boolean))] as string[];
  const exportCompanyIds = [...new Set(data.map((t) => t.company_id).filter(Boolean))] as string[];

  let exportUserMap = new Map<string, string>();
  if (exportUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("id, email")
      .in("id", exportUserIds);
    exportUserMap = new Map(
      (profiles ?? []).map((p: { id: string; email: string }) => [p.id, p.email])
    );
  }

  let exportCompanyMap = new Map<string, string>();
  if (exportCompanyIds.length > 0) {
    const { data: companies } = await supabase
      .from("companies")
      .select("id, name")
      .in("id", exportCompanyIds);
    exportCompanyMap = new Map(
      (companies ?? []).map((c: { id: string; name: string }) => [c.id, c.name])
    );
  }

  return data.map((t) => {
    return {
      ticket_number: t.ticket_number,
      subject: t.subject,
      status: t.status,
      priority: t.priority,
      category: t.category,
      user_email: t.user_id ? exportUserMap.get(t.user_id) ?? "" : "",
      company_name: t.company_id ? exportCompanyMap.get(t.company_id) ?? "" : "",
      created_at: t.created_at,
    };
  });
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

const EXPORT_HANDLERS: Record<string, () => Promise<Record<string, unknown>[]>> = {
  companies: exportCompanies,
  users: exportUsers,
  revenue: exportRevenue,
  tickets: exportTickets,
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const isAdmin = await isPlatformAdmin(supabase);

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = request.nextUrl;
    const type = searchParams.get("type");

    if (!type || !EXPORT_HANDLERS[type]) {
      return NextResponse.json(
        { error: "Invalid export type. Supported: companies, users, revenue, tickets." },
        { status: 400 }
      );
    }

    const rows = await EXPORT_HANDLERS[type]();
    const csv = toCsv(rows);
    const filename = `${type}-export-${new Date().toISOString().split("T")[0]}.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("Export API error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
