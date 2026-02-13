import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getBids, type BidStatus } from "@/lib/queries/crm";
import BidsClient from "./BidsClient";

export const metadata = {
  title: "Bid Management - ConstructionERP",
};

export default async function BidManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>;
}) {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/register");
  }

  const params = await searchParams;
  const { companyId } = userCompany;

  const statusFilter = params.status as BidStatus | undefined;
  const searchFilter = params.search;

  const bids = await getBids(supabase, companyId, {
    status: statusFilter,
    search: searchFilter,
  });

  // Count bids due soon (within 7 days) for the banner
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const dueSoonCount = bids.filter((bid) => {
    if (!bid.due_date) return false;
    const dueDate = new Date(bid.due_date);
    return dueDate >= now && dueDate <= sevenDaysFromNow;
  }).length;

  return (
    <BidsClient
      bids={bids}
      statusFilter={statusFilter}
      dueSoonCount={dueSoonCount}
    />
  );
}
