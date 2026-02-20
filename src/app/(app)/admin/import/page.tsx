import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import ImportClient from "./ImportClient";

export const metadata = {
  title: "Data Import - Buildwrk",
};

export default async function BulkImportPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/register");
  }

  return <ImportClient />;
}
