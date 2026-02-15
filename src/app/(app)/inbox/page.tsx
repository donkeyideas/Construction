import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getInboxItems,
  getUnreadCount,
  getCompanyMembers,
  getActiveAnnouncements,
} from "@/lib/queries/inbox";
import InboxClient from "./InboxClient";

export const metadata = {
  title: "Inbox - Buildwrk",
};

export default async function InboxPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/register");
  }

  const { userId, companyId } = userCompany;

  // Fetch all inbox data in parallel
  const [items, unreadCount, members, announcements] = await Promise.all([
    getInboxItems(supabase, companyId, userId),
    getUnreadCount(supabase, userId),
    getCompanyMembers(supabase, companyId),
    getActiveAnnouncements(supabase),
  ]);

  return (
    <InboxClient
      items={items}
      unreadCount={unreadCount}
      userId={userId}
      companyId={companyId}
      members={members}
      announcements={announcements}
    />
  );
}
