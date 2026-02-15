import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/queries/super-admin";
import { getSystemHealth } from "@/lib/queries/system-health";
import SystemHealthClient from "./SystemHealthClient";

export const metadata = {
  title: "System Health - Super Admin - Buildwrk",
};

export default async function SuperAdminSystemHealthPage() {
  const supabase = await createClient();

  const isAdmin = await isPlatformAdmin(supabase);
  if (!isAdmin) {
    redirect("/dashboard");
  }

  const healthData = await getSystemHealth();

  return <SystemHealthClient data={healthData} />;
}
