import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getEquipmentList, getEquipmentStats } from "@/lib/queries/equipment";
import { getCompanyMembers } from "@/lib/queries/tickets";
import EquipmentInventoryClient from "./EquipmentInventoryClient";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Equipment Inventory - ConstructionERP",
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

  return (
    <EquipmentInventoryClient
      equipment={equipment}
      stats={stats}
      members={members}
      projects={projects}
      userId={userCtx.userId}
      companyId={userCtx.companyId}
    />
  );
}
