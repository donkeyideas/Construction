import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVendorProjects } from "@/lib/queries/vendor-portal";
import SubmitInvoiceClient from "./SubmitInvoiceClient";

export const metadata = { title: "Submit Invoice - Buildwrk" };

export default async function SubmitInvoicePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { redirect("/login/vendor"); }

  const admin = createAdminClient();
  const projects = await getVendorProjects(admin, user.id);

  return <SubmitInvoiceClient projects={projects} />;
}
