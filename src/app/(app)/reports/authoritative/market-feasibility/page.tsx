import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { MarketFeasibilityClient } from "./MarketFeasibilityClient";

export const metadata = {
  title: "Market Feasibility Study - Buildwrk",
};

export default async function MarketFeasibilityPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/register");
  }

  // Fetch properties for selection
  const { data: properties } = await supabase
    .from("properties")
    .select(
      "id, name, property_type, address_line1, city, state, zip, total_units, occupied_units, occupancy_rate, monthly_revenue, noi, current_value"
    )
    .eq("company_id", userCompany.companyId)
    .order("name", { ascending: true });

  return (
    <MarketFeasibilityClient
      properties={properties ?? []}
      companyId={userCompany.companyId}
      companyName={userCompany.companyName ?? ""}
    />
  );
}
