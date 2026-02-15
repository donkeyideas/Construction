import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/queries/super-admin";
import {
  getRevenueStats,
  getRecentSubscriptionEvents,
} from "@/lib/queries/revenue";
import RevenueClient from "./RevenueClient";

export const metadata = {
  title: "Revenue - Super Admin - Buildwrk",
};

export default async function SuperAdminRevenuePage() {
  const supabase = await createClient();

  const isAdmin = await isPlatformAdmin(supabase);
  if (!isAdmin) {
    redirect("/dashboard");
  }

  const [stats, events] = await Promise.all([
    getRevenueStats(supabase),
    getRecentSubscriptionEvents(supabase, 50),
  ]);

  return <RevenueClient stats={stats} events={events} />;
}
