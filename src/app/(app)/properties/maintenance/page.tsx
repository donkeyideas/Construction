import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import MaintenanceClient from "./MaintenanceClient";

export const metadata = { title: "Maintenance - Buildwrk" };

export default async function MaintenancePage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">
          Please complete registration to access maintenance requests.
        </div>
      </div>
    );
  }

  const { companyId } = userCompany;

  const [requestsResult, propertiesResult, membersResult] = await Promise.all([
    supabase
      .from("maintenance_requests")
      .select("*, properties(name), units(unit_number)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    supabase
      .from("properties")
      .select("id, name")
      .eq("company_id", companyId)
      .order("name"),
    supabase
      .from("company_members")
      .select("user_id, role")
      .eq("company_id", companyId)
      .eq("is_active", true),
  ]);

  const requests = requestsResult.data ?? [];
  const properties = (propertiesResult.data ?? []).map((p: any) => ({
    id: p.id,
    name: p.name,
  }));

  // Batch-fetch user profiles for members
  const maintMemberData = membersResult.data ?? [];
  const maintMemberUserIds = [...new Set(maintMemberData.map((m: any) => m.user_id).filter(Boolean))] as string[];
  let maintMemberProfileMap = new Map<string, { full_name: string | null; email: string | null }>();
  if (maintMemberUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("id, full_name, email")
      .in("id", maintMemberUserIds);
    maintMemberProfileMap = new Map(
      (profiles ?? []).map((p: any) => [p.id, p])
    );
  }
  const members = maintMemberData.map((m: any) => ({
    user_id: m.user_id,
    role: m.role,
    full_name: m.user_id ? maintMemberProfileMap.get(m.user_id)?.full_name ?? null : null,
    email: m.user_id ? maintMemberProfileMap.get(m.user_id)?.email ?? null : null,
  }));

  return (
    <MaintenanceClient
      requests={requests}
      properties={properties}
      members={members}
    />
  );
}
