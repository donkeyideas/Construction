import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getBankAccounts, getBankingStats } from "@/lib/queries/banking";
import { ensureBankAccountGLLink, createOpeningBalanceJE } from "@/lib/utils/bank-gl-linkage";
import BankingClient from "./BankingClient";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Banking - Buildwrk",
};

/**
 * Backfill: ensure every bank account has a GL sub-account (1040-1099)
 * and a reclassification JE moving its balance from 1000 → sub-account.
 * Idempotent — safe to run on every page load.
 */
async function backfillBankGLLinks(
  supabase: Parameters<typeof ensureBankAccountGLLink>[0],
  companyId: string,
  userId: string
) {
  const { data: banks } = await supabase
    .from("bank_accounts")
    .select("id, name, account_type, current_balance, gl_account_id")
    .eq("company_id", companyId);

  if (!banks || banks.length === 0) return;

  for (const bank of banks) {
    try {
      if (!bank.gl_account_id) {
        // No GL link at all — create sub-account + reclassification JE
        await ensureBankAccountGLLink(
          supabase, companyId, bank.id,
          bank.name || "", bank.account_type || "checking",
          bank.current_balance ?? 0, userId
        );
      } else if ((bank.current_balance ?? 0) > 0) {
        // Has GL link — verify reclassification JE exists
        const ref = `opening_balance:bank:${bank.id}`;
        const { data: existingJE } = await supabase
          .from("journal_entries")
          .select("id")
          .eq("company_id", companyId)
          .eq("reference", ref)
          .limit(1);

        if (!existingJE || existingJE.length === 0) {
          // GL link exists but no reclassification JE — create it directly
          await createOpeningBalanceJE(
            supabase, companyId, userId, bank.id,
            bank.gl_account_id, bank.current_balance,
            bank.name || ""
          );
        }
      }
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
  await backfillBankGLLinks(supabase, userCtx.companyId, userCtx.userId);

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
