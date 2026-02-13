import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getEquipmentList, getEquipmentStats } from "@/lib/queries/equipment";
import EquipmentDashboardClient from "./EquipmentDashboardClient";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Equipment - ConstructionERP",
};

export default async function EquipmentPage() {
  const supabase = await createClient();
  const userCtx = await getCurrentUserCompany(supabase);

  if (!userCtx) {
    redirect("/login");
  }

  const [equipment, stats] = await Promise.all([
    getEquipmentList(supabase, userCtx.companyId),
    getEquipmentStats(supabase, userCtx.companyId),
  ]);

  // Get only the 10 most recent for the dashboard
  const recentEquipment = equipment.slice(0, 10);

  return (
    <EquipmentDashboardClient
      equipment={recentEquipment}
      stats={stats}
    />
  );
}
