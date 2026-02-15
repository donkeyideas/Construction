import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import LeasesClient from "./LeasesClient";

export const metadata = { title: "Leases - Buildwrk" };

export default async function LeasesPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">Please complete registration to access leases.</div>
      </div>
    );
  }

  const { companyId } = userCompany;

  const [leasesResult, propertiesResult, unitsResult] = await Promise.all([
    supabase
      .from("leases")
      .select("*, properties(name), units(unit_number)")
      .eq("company_id", companyId)
      .order("lease_end", { ascending: true }),
    supabase
      .from("properties")
      .select("id, name")
      .eq("company_id", companyId),
    supabase
      .from("units")
      .select("id, unit_number, property_id, properties(name)")
      .eq("company_id", companyId),
  ]);

  const leases = leasesResult.data ?? [];
  const properties = propertiesResult.data ?? [];
  const units = (unitsResult.data ?? []).map((u: any) => ({
    id: u.id,
    unit_number: u.unit_number,
    property_id: u.property_id,
    property_name: (u.properties as any)?.name ?? "Unknown",
  }));

  return <LeasesClient leases={leases} properties={properties} units={units} />;
}
