import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/queries/super-admin";
import DataExportClient from "./DataExportClient";

export const metadata = {
  title: "Data Export - Super Admin - Buildwrk",
};

export default async function SuperAdminDataExportPage() {
  const supabase = await createClient();

  const isAdmin = await isPlatformAdmin(supabase);
  if (!isAdmin) {
    redirect("/dashboard");
  }

  return <DataExportClient />;
}
