import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin, getCmsPages } from "@/lib/queries/super-admin";
import ContentClient from "./ContentClient";

export const metadata = {
  title: "CMS Pages - Super Admin - ConstructionERP",
};

export default async function SuperAdminContentPage() {
  const supabase = await createClient();

  const isAdmin = await isPlatformAdmin(supabase);
  if (!isAdmin) {
    redirect("/dashboard");
  }

  const pages = await getCmsPages(supabase);

  return <ContentClient pages={pages} />;
}
