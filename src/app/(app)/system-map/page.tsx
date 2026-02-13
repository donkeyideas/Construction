import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { redirect } from "next/navigation";
import { systemMap } from "@/lib/config/system-map";
import SystemMapClient from "./SystemMapClient";

export const metadata = {
  title: "System Map - ConstructionERP",
};

export default async function SystemMapPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/login");
  }

  return <SystemMapClient dashboards={systemMap} />;
}
