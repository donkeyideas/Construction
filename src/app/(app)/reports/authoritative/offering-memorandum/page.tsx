import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { OfferingMemorandumClient } from "./OfferingMemorandumClient";

export const metadata = {
  title: "Offering Memorandum - Buildwrk",
};

export default async function OfferingMemorandumPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/register");
  }

  const { data: properties } = await supabase
    .from("properties")
    .select(
      "id, name, property_type, address_line1, city, state, zip, total_units, occupied_units, occupancy_rate, monthly_revenue, noi, current_value"
    )
    .eq("company_id", userCompany.companyId)
    .order("name", { ascending: true });

  return (
    <OfferingMemorandumClient
      properties={properties ?? []}
      companyId={userCompany.companyId}
      companyName={userCompany.companyName ?? ""}
    />
  );
}
