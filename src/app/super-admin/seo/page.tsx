import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/queries/super-admin";
import SeoClient from "./SeoClient";

export const metadata = {
  title: "SEO & GEO - Super Admin - ConstructionERP",
};

export default async function SuperAdminSeoPage() {
  const supabase = await createClient();

  const isAdmin = await isPlatformAdmin(supabase);
  if (!isAdmin) {
    redirect("/dashboard");
  }

  const { data: keywords } = await supabase
    .from("seo_keywords")
    .select("*")
    .order("search_volume", { ascending: false });

  return <SeoClient keywords={keywords ?? []} />;
}
