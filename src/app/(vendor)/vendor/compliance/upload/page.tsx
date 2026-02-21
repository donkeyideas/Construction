import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import UploadCertClient from "./UploadCertClient";

export const metadata = { title: "Upload Document - Buildwrk" };

export default async function UploadDocumentPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login/vendor");

  return <UploadCertClient />;
}
