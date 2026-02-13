import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getTickets, getTicketStats, getCompanyMembers } from "@/lib/queries/tickets";
import TicketListClient from "./TicketListClient";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Tickets - ConstructionERP",
};

export default async function TicketsPage() {
  const supabase = await createClient();
  const userCtx = await getCurrentUserCompany(supabase);

  if (!userCtx) {
    redirect("/login");
  }

  const [tickets, stats, members] = await Promise.all([
    getTickets(supabase, userCtx.companyId),
    getTicketStats(supabase, userCtx.companyId),
    getCompanyMembers(supabase, userCtx.companyId),
  ]);

  return (
    <TicketListClient
      tickets={tickets}
      stats={stats}
      members={members}
      userId={userCtx.userId}
      companyId={userCtx.companyId}
    />
  );
}
