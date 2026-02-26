import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getMaintenanceLogs, getEquipmentList } from "@/lib/queries/equipment";
import { findLinkedJournalEntriesBatch } from "@/lib/utils/je-linkage";
import EquipmentMaintenanceClient from "./EquipmentMaintenanceClient";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Equipment Maintenance - Buildwrk",
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

  // Batch-fetch linked journal entries for maintenance logs
  const logIds = logs.map((l) => l.id);
  // Try both reference prefixes used for maintenance JEs
  const [jeMap1, jeMap2] = await Promise.all([
    findLinkedJournalEntriesBatch(supabase, userCtx.companyId, "maintenance:", logIds),
    findLinkedJournalEntriesBatch(supabase, userCtx.companyId, "equip_maintenance:", logIds),
  ]);
  const linkedJEs: Record<string, { id: string; entry_number: string }[]> = {};
  for (const [entityId, entries] of jeMap1) {
    linkedJEs[entityId] = entries.map((e) => ({ id: e.id, entry_number: e.entry_number }));
  }
  for (const [entityId, entries] of jeMap2) {
    const existing = linkedJEs[entityId] ?? [];
    existing.push(...entries.map((e) => ({ id: e.id, entry_number: e.entry_number })));
    linkedJEs[entityId] = existing;
  }

  return (
    <EquipmentMaintenanceClient
      logs={logs}
      equipmentList={equipmentList}
      userId={userCtx.userId}
      companyId={userCtx.companyId}
      linkedJEs={linkedJEs}
    />
  );
}
