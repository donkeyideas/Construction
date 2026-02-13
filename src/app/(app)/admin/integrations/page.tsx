import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import IntegrationsClient from "./IntegrationsClient";

export const metadata = {
  title: "Integrations - ConstructionERP",
};

export default async function AdminIntegrationsPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/register");
  }

  return <IntegrationsClient />;
}
