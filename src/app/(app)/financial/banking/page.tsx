import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getBankAccounts, getBankingStats } from "@/lib/queries/banking";
import BankingClient from "./BankingClient";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Banking - ConstructionERP",
};

export default async function BankingPage() {
  const supabase = await createClient();
  const userCtx = await getCurrentUserCompany(supabase);

  if (!userCtx) {
    redirect("/login");
  }

  const [accounts, stats] = await Promise.all([
    getBankAccounts(supabase, userCtx.companyId),
    getBankingStats(supabase, userCtx.companyId),
  ]);

  return (
    <BankingClient
      accounts={accounts}
      stats={stats}
      companyId={userCtx.companyId}
    />
  );
}
