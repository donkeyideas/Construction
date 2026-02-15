import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  isPlatformAdmin,
  getPlatformStats,
  getAllCompanies,
  getCompanyMemberCounts,
  getPlatformAnnouncements,
  getSubscriptionEvents,
} from "@/lib/queries/super-admin";
import { getRevenueStats } from "@/lib/queries/revenue";
import SuperAdminDashboardClient from "./SuperAdminDashboardClient";

export const metadata = {
  title: "Platform Overview - Super Admin - Buildwrk",
};

export default async function SuperAdminDashboardPage() {
  const supabase = await createClient();

  const isAdmin = await isPlatformAdmin(supabase);
  if (!isAdmin) {
    redirect("/dashboard");
  }

  const [stats, companies, memberCounts, announcements, subscriptionEvents, revenueStats] =
    await Promise.all([
      getPlatformStats(supabase),
      getAllCompanies(supabase),
      getCompanyMemberCounts(supabase),
      getPlatformAnnouncements(supabase),
      getSubscriptionEvents(supabase, 10),
      getRevenueStats(supabase),
    ]);

  const enrichedCompanies = companies.map((c) => ({
    ...c,
    member_count: memberCounts[c.id] || 0,
  }));

  return (
    <SuperAdminDashboardClient
      stats={stats}
      companies={enrichedCompanies}
      announcements={announcements}
      subscriptionEvents={subscriptionEvents}
      estimatedMRR={revenueStats.estimatedMRR}
    />
  );
}
