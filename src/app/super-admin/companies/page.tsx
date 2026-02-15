import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  isPlatformAdmin,
  getAllCompanies,
  getCompanyMemberCounts,
  getCompanyMembers,
} from "@/lib/queries/super-admin";
import type { CompanyMember } from "@/lib/queries/super-admin";
import CompaniesClient from "./CompaniesClient";

export const metadata = {
  title: "Companies - Super Admin - Buildwrk",
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

  // Fetch members for all companies in parallel
  const membersByCompany: Record<string, CompanyMember[]> = {};
  const memberResults = await Promise.all(
    companies.map((c) => getCompanyMembers(supabase, c.id))
  );
  companies.forEach((c, i) => {
    membersByCompany[c.id] = memberResults[i];
  });

  const enrichedCompanies = companies.map((c) => ({
    ...c,
    member_count: memberCounts[c.id] || 0,
  }));

  return <CompaniesClient companies={enrichedCompanies} membersByCompany={membersByCompany} />;
}
