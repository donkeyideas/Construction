import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/queries/super-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import BetaApplicationsClient from "./BetaApplicationsClient";

export default async function BetaApplicationsPage() {
  const supabase = await createClient();
  const isAdmin = await isPlatformAdmin(supabase);
  if (!isAdmin) redirect("/dashboard");

  const admin = createAdminClient();
  const { data: applications } = await admin
    .from("beta_applications")
    .select("*")
    .order("created_at", { ascending: false });

  return <BetaApplicationsClient applications={applications || []} />;
}
