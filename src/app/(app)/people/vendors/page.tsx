import { Truck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import VendorsClient from "./VendorsClient";

export const metadata = {
  title: "Vendors & Subcontractors - Buildwrk",
};

export default async function VendorsPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon"><Truck size={48} /></div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">Please complete registration to access vendors.</div>
      </div>
    );
  }

  const { companyId } = userCompany;

  // Fetch vendor contacts, vendor contracts, and projects in parallel
  const [{ data: contacts }, { data: contracts }, { data: projects }] = await Promise.all([
    supabase
      .from("contacts")
      .select("*")
      .eq("company_id", companyId)
      .in("contact_type", ["vendor", "subcontractor"])
      .eq("is_active", true)
      .order("company_name"),
    supabase
      .from("vendor_contracts")
      .select("*, contacts(first_name, last_name, company_name)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    supabase
      .from("projects")
      .select("id, name, code, status")
      .eq("company_id", companyId)
      .order("name"),
  ]);

  return (
    <div>
      <VendorsClient
        contacts={contacts ?? []}
        contracts={contracts ?? []}
        projects={projects ?? []}
      />
    </div>
  );
}
