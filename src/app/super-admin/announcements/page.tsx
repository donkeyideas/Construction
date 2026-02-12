import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  isPlatformAdmin,
  getPlatformAnnouncements,
} from "@/lib/queries/super-admin";
import AnnouncementsClient from "./AnnouncementsClient";

export const metadata = {
  title: "Announcements - Super Admin - ConstructionERP",
};

export default async function SuperAdminAnnouncementsPage() {
  const supabase = await createClient();

  const isAdmin = await isPlatformAdmin(supabase);
  if (!isAdmin) {
    redirect("/dashboard");
  }

  const announcements = await getPlatformAnnouncements(supabase);

  return <AnnouncementsClient announcements={announcements} />;
}
