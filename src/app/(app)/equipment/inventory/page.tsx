import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getEquipmentList, getEquipmentStats } from "@/lib/queries/equipment";
import { getCompanyMembers } from "@/lib/queries/tickets";
import { findLinkedJournalEntriesBatch } from "@/lib/utils/je-linkage";
import EquipmentInventoryClient from "./EquipmentInventoryClient";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Equipment Inventory - Buildwrk",
};

export default async function EquipmentInventoryPage() {
  const supabase = await createClient();
  const userCtx = await getCurrentUserCompany(supabase);

  if (!userCtx) {
    redirect("/login");
  }

  const [equipment, stats, members, projectsRes] = await Promise.all([
    getEquipmentList(supabase, userCtx.companyId),
    getEquipmentStats(supabase, userCtx.companyId),
    getCompanyMembers(supabase, userCtx.companyId),
    supabase
      .from("projects")
      .select("id, name")
      .eq("company_id", userCtx.companyId)
      .order("name", { ascending: true }),
  ]);

  const projects = projectsRes.data ?? [];

  // Batch-fetch linked journal entries for equipment purchases
  const equipmentIds = equipment.map((e) => e.id);
  const jeMap = await findLinkedJournalEntriesBatch(supabase, userCtx.companyId, "equipment_purchase:", equipmentIds);
  const linkedJEs: Record<string, { id: string; entry_number: string }[]> = {};
  for (const [entityId, entries] of jeMap) {
    linkedJEs[entityId] = entries.map((e) => ({ id: e.id, entry_number: e.entry_number }));
  }

  return (
    <EquipmentInventoryClient
      equipment={equipment}
      stats={stats}
      members={members}
      projects={projects}
      userId={userCtx.userId}
      companyId={userCtx.companyId}
      linkedJEs={linkedJEs}
    />
  );
}
