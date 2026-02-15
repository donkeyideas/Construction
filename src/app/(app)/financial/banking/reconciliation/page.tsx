import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getBankReconciliations,
  getBankAccounts,
} from "@/lib/queries/banking";
import ReconciliationClient from "./ReconciliationClient";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Bank Reconciliation - Buildwrk",
};

export default async function ReconciliationPage() {
  const supabase = await createClient();
  const userCtx = await getCurrentUserCompany(supabase);

  if (!userCtx) {
    redirect("/login");
  }

  const [reconciliations, accounts] = await Promise.all([
    getBankReconciliations(supabase, userCtx.companyId),
    getBankAccounts(supabase, userCtx.companyId),
  ]);

  return (
    <ReconciliationClient
      reconciliations={reconciliations}
      accounts={accounts}
      companyId={userCtx.companyId}
      userId={userCtx.userId}
    />
  );
}
