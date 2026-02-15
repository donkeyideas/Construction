import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  isPlatformAdmin,
  getSubscriptionEvents,
  getAllCompanies,
} from "@/lib/queries/super-admin";
import SubscriptionsClient from "./SubscriptionsClient";

export const metadata = {
  title: "Subscriptions - Super Admin - Buildwrk",
};

export default async function SuperAdminSubscriptionsPage() {
  const supabase = await createClient();

  const isAdmin = await isPlatformAdmin(supabase);
  if (!isAdmin) {
    redirect("/dashboard");
  }

  const [events, companies] = await Promise.all([
    getSubscriptionEvents(supabase, 100),
    getAllCompanies(supabase),
  ]);

  const companySubs = companies.map((c) => ({
    id: c.id,
    name: c.name,
    plan: c.subscription_plan || "free",
    status: c.subscription_status || "active",
    created_at: c.created_at,
  }));

  return (
    <SubscriptionsClient companies={companySubs} events={events} />
  );
}
