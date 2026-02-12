import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  isPlatformAdmin,
  getAllCompanies,
  getCompanyMemberCounts,
} from "@/lib/queries/super-admin";
import CompaniesClient from "./CompaniesClient";

export const metadata = {
  title: "Companies - Super Admin - ConstructionERP",
};

export default async function SuperAdminCompaniesPage() {
  const supabase = await createClient();

  const isAdmin = await isPlatformAdmin(supabase);
  if (!isAdmin) {
    redirect("/dashboard");
  }

  const [companies, memberCounts] = await Promise.all([
    getAllCompanies(supabase),
    getCompanyMemberCounts(supabase),
  ]);

  const enrichedCompanies = companies.map((c) => ({
    ...c,
    member_count: memberCounts[c.id] || 0,
  }));

  return <CompaniesClient companies={enrichedCompanies} />;
}
