import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/queries/super-admin";
import { getEmailTemplates } from "@/lib/queries/email-templates";
import EmailTemplatesClient from "./EmailTemplatesClient";

export const metadata = {
  title: "Email Templates - Super Admin - Buildwrk",
};

export default async function SuperAdminEmailTemplatesPage() {
  const supabase = await createClient();

  const isAdmin = await isPlatformAdmin(supabase);
  if (!isAdmin) {
    redirect("/dashboard");
  }

  const templates = await getEmailTemplates();

  return <EmailTemplatesClient templates={templates} />;
}
