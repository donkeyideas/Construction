import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/queries/super-admin";
import { getPromoCodes } from "@/lib/queries/promo-codes";
import PromoCodesClient from "./PromoCodesClient";

export const metadata = {
  title: "Promo Codes - Super Admin - Buildwrk",
};

export default async function SuperAdminPromoCodesPage() {
  const supabase = await createClient();

  const isAdmin = await isPlatformAdmin(supabase);
  if (!isAdmin) {
    redirect("/dashboard");
  }

  const promoCodes = await getPromoCodes(supabase);

  return <PromoCodesClient promoCodes={promoCodes} />;
}
