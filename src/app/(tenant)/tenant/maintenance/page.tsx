import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTenantMaintenanceRequests } from "@/lib/queries/tenant-portal";
import MaintenanceClient from "./MaintenanceClient";

export const metadata = {
  title: "Maintenance Requests - ConstructionERP",
};

export default async function TenantMaintenancePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login/tenant");
  }

  const requests = await getTenantMaintenanceRequests(supabase, user.id);

  return <MaintenanceClient requests={requests} />;
}
