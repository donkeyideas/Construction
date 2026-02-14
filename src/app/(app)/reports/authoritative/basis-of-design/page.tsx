import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { BasisOfDesignClient } from "./BasisOfDesignClient";

export const metadata = {
  title: "Basis of Design - Buildwrk",
};

export default async function BasisOfDesignPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/register");
  }

  const { data: projects } = await supabase
    .from("projects")
    .select(
      "id, name, code, status, project_type, client_name, contract_amount, estimated_cost, actual_cost, completion_pct, start_date, estimated_end_date"
    )
    .eq("company_id", userCompany.companyId)
    .order("name", { ascending: true });

  return (
    <BasisOfDesignClient
      projects={projects ?? []}
      companyId={userCompany.companyId}
      companyName={userCompany.companyName ?? ""}
    />
  );
}
