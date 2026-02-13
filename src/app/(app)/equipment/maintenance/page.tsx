import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getMaintenanceLogs, getEquipmentList } from "@/lib/queries/equipment";
import EquipmentMaintenanceClient from "./EquipmentMaintenanceClient";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Equipment Maintenance - ConstructionERP",
};

export default async function EquipmentMaintenancePage() {
  const supabase = await createClient();
  const userCtx = await getCurrentUserCompany(supabase);

  if (!userCtx) {
    redirect("/login");
  }

  const [logs, equipmentList] = await Promise.all([
    getMaintenanceLogs(supabase, userCtx.companyId),
    getEquipmentList(supabase, userCtx.companyId),
  ]);

  return (
    <EquipmentMaintenanceClient
      logs={logs}
      equipmentList={equipmentList}
      userId={userCtx.userId}
      companyId={userCtx.companyId}
    />
  );
}
