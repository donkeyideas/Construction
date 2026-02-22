import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import IntegrationsClient from "./IntegrationsClient";

export const metadata = {
  title: "Integrations - Buildwrk",
};

export interface IntegrationConnection {
  provider: string;
  status: string;
  is_connected: boolean;
  connected_at: string | null;
  last_sync_at: string | null;
}

export default async function AdminIntegrationsPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/register");
  }

  // Fetch existing integration connections for this company
  const { data: connections } = await supabase
    .from("integrations")
    .select("provider, status, is_connected, connected_at, last_sync_at")
    .eq("company_id", userCompany.companyId);

  return (
    <IntegrationsClient
      connections={(connections ?? []) as IntegrationConnection[]}
      userRole={userCompany.role}
    />
  );
}
