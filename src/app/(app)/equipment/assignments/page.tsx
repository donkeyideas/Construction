import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getAssignments, getEquipmentList } from "@/lib/queries/equipment";
import { getCompanyMembers } from "@/lib/queries/tickets";
import EquipmentAssignmentsClient from "./EquipmentAssignmentsClient";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Equipment Assignments - Buildwrk",
};

export default async function EquipmentAssignmentsPage() {
  const supabase = await createClient();
  const userCtx = await getCurrentUserCompany(supabase);

  if (!userCtx) {
    redirect("/login");
  }

  const [assignments, equipmentList, members, projectsRes] = await Promise.all([
    getAssignments(supabase, userCtx.companyId),
    getEquipmentList(supabase, userCtx.companyId),
    getCompanyMembers(supabase, userCtx.companyId),
    supabase
      .from("projects")
      .select("id, name")
      .eq("company_id", userCtx.companyId)
      .order("name", { ascending: true }),
  ]);

  const projects = projectsRes.data ?? [];

  return (
    <EquipmentAssignmentsClient
      assignments={assignments}
      equipmentList={equipmentList}
      members={members}
      projects={projects}
      userId={userCtx.userId}
      companyId={userCtx.companyId}
    />
  );
}
