import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTenantDashboard } from "@/lib/queries/tenant-portal";
import TenantDashboardClient from "./TenantDashboardClient";

export const metadata = {
  title: "Tenant Portal - Buildwrk",
};

export default async function TenantDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login/tenant");
  }

  const dashboard = await getTenantDashboard(supabase, user.id);

  return <TenantDashboardClient dashboard={dashboard} />;
}
