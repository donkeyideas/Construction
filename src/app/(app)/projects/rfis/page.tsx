import {
  MessageSquareMore,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import RfisClient from "./RfisClient";

export const metadata = {
  title: "RFIs - Buildwrk",
};

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function RfisPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon"><MessageSquareMore size={48} /></div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">Please complete registration to access RFIs.</div>
      </div>
    );
  }

  const activeStatus = params.status || undefined;

  // Build query
  let query = supabase
    .from("rfis")
    .select("*, projects(name, code)")
    .eq("company_id", userCompany.companyId)
    .order("created_at", { ascending: false });

  if (activeStatus && activeStatus !== "all") {
    query = query.eq("status", activeStatus);
  }

  // Fetch RFIs, KPI data, projects, company members, and people directory contacts in parallel
  const [rfisResult, allRfisResult, projectsResult, membersResult, contactsResult] =
    await Promise.all([
      query,
      supabase
        .from("rfis")
        .select("id, status")
        .eq("company_id", userCompany.companyId),
      supabase
        .from("projects")
        .select("id, name, code")
        .eq("company_id", userCompany.companyId)
        .order("name"),
      supabase
        .from("company_members")
        .select("user_id, role")
        .eq("company_id", userCompany.companyId)
        .eq("is_active", true),
      // Fetch employees and subcontractors from People directory
      supabase
        .from("contacts")
        .select("id, first_name, last_name, job_title, contact_type")
        .eq("company_id", userCompany.companyId)
        .eq("is_active", true)
        .in("contact_type", ["employee", "subcontractor"])
        .order("first_name"),
    ]);

  const rows = rfisResult.data ?? [];
  const all = allRfisResult.data ?? [];
  const projects = projectsResult.data ?? [];
  const peopleContacts = contactsResult.data ?? [];

  // Batch-fetch user profiles for members
  const rfiMemberData = membersResult.data ?? [];
  const rfiMemberUserIds = [...new Set(rfiMemberData.map((m) => m.user_id).filter(Boolean))] as string[];
  let rfiMemberProfileMap = new Map<string, { full_name: string | null; email: string | null }>();
  if (rfiMemberUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("id, full_name, email")
      .in("id", rfiMemberUserIds);
    rfiMemberProfileMap = new Map(
      (profiles ?? []).map((p: { id: string; full_name: string | null; email: string | null }) => [p.id, p])
    );
  }
  const members = rfiMemberData.map((m) => ({
    user_id: m.user_id,
    role: m.role,
    user: m.user_id ? rfiMemberProfileMap.get(m.user_id) ?? null : null,
  }));

  // KPI calculations
  const totalCount = all.length;
  const openCount = all.filter((r) => r.status === "open").length;
  const answeredCount = all.filter((r) => r.status === "answered").length;
  const closedCount = all.filter((r) => r.status === "closed").length;

  // User name lookup (for system users assigned_to / submitted_by)
  const userIds = new Set<string>();
  for (const rfi of rows) {
    if (rfi.submitted_by) userIds.add(rfi.submitted_by);
    if (rfi.assigned_to) userIds.add(rfi.assigned_to);
  }

  const userMap: Record<string, string> = {};
  if (userIds.size > 0) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("id, full_name, email")
      .in("id", Array.from(userIds));

    for (const p of profiles ?? []) {
      userMap[p.id] = p.full_name || p.email || "Unknown";
    }
  }

  // Also add contacts to userMap by their id so assigned_to_contact_id lookups work
  for (const c of peopleContacts) {
    const name = [c.first_name, c.last_name].filter(Boolean).join(" ") || "Unknown";
    userMap[c.id] = name;
  }

  return (
    <RfisClient
      rows={rows}
      kpi={{ totalCount, openCount, answeredCount, closedCount }}
      userMap={userMap}
      projects={projects}
      members={members}
      peopleContacts={peopleContacts}
      activeStatus={activeStatus}
    />
  );
}
