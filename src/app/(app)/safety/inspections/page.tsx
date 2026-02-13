import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import InspectionsClient from "./InspectionsClient";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Safety Inspections - ConstructionERP",
};

export default async function SafetyInspectionsPage() {
  const supabase = await createClient();
  const userCtx = await getCurrentUserCompany(supabase);

  if (!userCtx) {
    redirect("/login");
  }

  const { data: inspections } = await supabase
    .from("safety_inspections")
    .select("*, projects(name)")
    .eq("company_id", userCtx.companyId)
    .order("inspection_date", { ascending: false });

  return (
    <InspectionsClient
      inspections={inspections ?? []}
    />
  );
}
