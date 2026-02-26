import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getBankAccounts, getBankingStats } from "@/lib/queries/banking";
import { ensureBankAccountGLLink, syncBankBalancesFromGL } from "@/lib/utils/bank-gl-linkage";
import BankingClient from "./BankingClient";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Banking - Buildwrk",
};

/**
 * Backfill: ensure every bank account has a GL sub-account (1040-1099).
 * Does NOT create reclassification JEs — that's handled by syncBankBalancesFromGL.
 */
async function backfillBankGLLinks(
  supabase: Parameters<typeof ensureBankAccountGLLink>[0],
  companyId: string,
) {
  const { data: banks } = await supabase
    .from("bank_accounts")
    .select("id, name, account_type, gl_account_id")
    .eq("company_id", companyId);

  if (!banks || banks.length === 0) return;

  for (const bank of banks) {
    if (bank.gl_account_id) continue; // Already linked
    try {
      await ensureBankAccountGLLink(
        supabase, companyId, bank.id,
        bank.name || "", bank.account_type || "checking"
      );
    } catch (err) {
      console.error(`Backfill GL link for bank "${bank.name}":`, err);
    }
  }
}

export default async function BankingPage() {
  const supabase = await createClient();
  const userCtx = await getCurrentUserCompany(supabase);

  if (!userCtx) {
    redirect("/login");
  }

  // Backfill GL links for any bank accounts missing them
  await backfillBankGLLinks(supabase, userCtx.companyId);

  // Sync bank balances only if not recently synced (within last 60 seconds)
  try {
    const { data: recentSync } = await supabase
      .from("journal_entries")
      .select("id")
      .eq("company_id", userCtx.companyId)
      .like("reference", "bank-reclass:%")
      .gte("created_at", new Date(Date.now() - 60_000).toISOString())
      .limit(1);
    if (!recentSync || recentSync.length === 0) {
      await syncBankBalancesFromGL(supabase, userCtx.companyId, userCtx.userId);
    }
  } catch (err) {
    console.error("Bank balance sync on Banking page:", err);
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
