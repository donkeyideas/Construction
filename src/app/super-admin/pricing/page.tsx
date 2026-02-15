import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/queries/super-admin";
import PricingClient from "./PricingClient";

export const metadata = {
  title: "Pricing Tiers - Super Admin - Buildwrk",
};

export default async function SuperAdminPricingPage() {
  const supabase = await createClient();

  const isAdmin = await isPlatformAdmin(supabase);
  if (!isAdmin) {
    redirect("/dashboard");
  }

  const { data: tiers } = await supabase
    .from("pricing_tiers")
    .select("*")
    .order("sort_order", { ascending: true });

  return <PricingClient initialTiers={tiers ?? []} />;
}
