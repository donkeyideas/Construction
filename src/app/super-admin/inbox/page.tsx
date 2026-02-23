import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/queries/super-admin";
import {
  getContactSubmissions,
  getContactSubmissionStats,
} from "@/lib/queries/contact-submissions";
import InboxClient from "./InboxClient";

export const metadata = {
  title: "Inbox - Super Admin - Buildwrk",
};

export default async function SuperAdminInboxPage() {
  const supabase = await createClient();

  const isAdmin = await isPlatformAdmin(supabase);
  if (!isAdmin) {
    redirect("/dashboard");
  }

  const [submissions, stats] = await Promise.all([
    getContactSubmissions(),
    getContactSubmissionStats(),
  ]);

  return <InboxClient submissions={submissions} stats={stats} />;
}
