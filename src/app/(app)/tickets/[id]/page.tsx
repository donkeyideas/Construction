import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getTicketById, getTicketComments, getCompanyMembers } from "@/lib/queries/tickets";
import TicketDetailClient from "./TicketDetailClient";
import { redirect, notFound } from "next/navigation";

export const metadata = {
  title: "Ticket Detail - ConstructionERP",
};

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const userCtx = await getCurrentUserCompany(supabase);

  if (!userCtx) {
    redirect("/login");
  }

  const [ticket, comments, members] = await Promise.all([
    getTicketById(supabase, id),
    getTicketComments(supabase, id),
    getCompanyMembers(supabase, userCtx.companyId),
  ]);

  if (!ticket || ticket.company_id !== userCtx.companyId) {
    notFound();
  }

  return (
    <TicketDetailClient
      ticket={ticket}
      comments={comments}
      members={members}
      userId={userCtx.userId}
      companyId={userCtx.companyId}
    />
  );
}
