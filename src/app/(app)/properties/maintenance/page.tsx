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
      .select(
        "user_id, role, user:user_profiles!company_members_user_profile_fkey(full_name, email)"
      )
      .eq("company_id", companyId)
      .eq("is_active", true),
  ]);

  const requests = requestsResult.data ?? [];
  const properties = (propertiesResult.data ?? []).map((p: any) => ({
    id: p.id,
    name: p.name,
  }));
  const members = (membersResult.data ?? []).map((m: any) => ({
    user_id: m.user_id,
    role: m.role,
    full_name: (m.user as any)?.full_name ?? null,
    email: (m.user as any)?.email ?? null,
  }));

  return (
    <MaintenanceClient
      requests={requests}
      properties={properties}
      members={members}
    />
  );
}
