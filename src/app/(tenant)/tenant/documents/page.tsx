import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTenantDocuments } from "@/lib/queries/tenant-portal";
import DocumentsClient from "./DocumentsClient";

export const metadata = {
  title: "Documents - ConstructionERP",
};

export default async function TenantDocumentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login/tenant");
  }

  const documents = await getTenantDocuments(supabase, user.id);

  return <DocumentsClient documents={documents} />;
}
