import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getCompanyMembers,
  getRolePermissions,
} from "@/lib/queries/admin";
import AdminUsersClient from "./AdminUsersClient";

export const metadata = {
  title: "Users & Roles - ConstructionERP",
};

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/register");
  }

  const { companyId, role: currentUserRole } = userCompany;

  const [members, rolePermissions] = await Promise.all([
    getCompanyMembers(supabase, companyId),
    getRolePermissions(supabase),
  ]);

  const totalMembers = members.length;
  const activeMembers = members.filter((m) => m.is_active).length;
  const pendingInvites = members.filter(
    (m) => !m.is_active && m.invited_email
  ).length;

  // Role distribution
  const roleDistribution: Record<string, number> = {};
  for (const m of members) {
    roleDistribution[m.role] = (roleDistribution[m.role] || 0) + 1;
  }

  // Build permissions matrix for display
  const permissionsByRole: Record<string, Record<string, boolean>> = {};
  const allPermissions = new Set<string>();
  for (const rp of rolePermissions) {
    if (!permissionsByRole[rp.role]) {
      permissionsByRole[rp.role] = {};
    }
    permissionsByRole[rp.role][rp.permission] = rp.allowed;
    allPermissions.add(rp.permission);
  }

  return (
    <AdminUsersClient
      members={members}
      totalMembers={totalMembers}
      activeMembers={activeMembers}
      pendingInvites={pendingInvites}
      roleDistribution={roleDistribution}
      permissionsByRole={permissionsByRole}
      allPermissions={Array.from(allPermissions).sort()}
      currentUserRole={currentUserRole}
      companyId={companyId}
    />
  );
}
