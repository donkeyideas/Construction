import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/queries/super-admin";
import {
  getSupportTickets,
  getSupportTicketStats,
} from "@/lib/queries/support-tickets";
import SupportTicketsClient from "./SupportTicketsClient";

export const metadata = {
  title: "Support Tickets - Super Admin - Buildwrk",
};

export default async function SuperAdminSupportTicketsPage() {
  const supabase = await createClient();

  const isAdmin = await isPlatformAdmin(supabase);
  if (!isAdmin) {
    redirect("/dashboard");
  }

  const [tickets, stats] = await Promise.all([
    getSupportTickets(),
    getSupportTicketStats(),
  ]);

  return <SupportTicketsClient tickets={tickets} stats={stats} />;
}
