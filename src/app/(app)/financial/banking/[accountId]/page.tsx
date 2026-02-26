import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getBankAccountById,
  getBankTransactions,
  getBankAccountGLTransactions,
} from "@/lib/queries/banking";
import BankTransactionsClient from "./BankTransactionsClient";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Bank Transactions - Buildwrk",
};

export default async function BankTransactionsPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;
  const supabase = await createClient();
  const userCtx = await getCurrentUserCompany(supabase);

  if (!userCtx) {
    redirect("/login");
  }

  const [account, transactions, glTransactions] = await Promise.all([
    getBankAccountById(supabase, accountId),
    getBankTransactions(supabase, userCtx.companyId, accountId),
    getBankAccountGLTransactions(supabase, userCtx.companyId, accountId),
  ]);

  if (!account || account.company_id !== userCtx.companyId) {
    redirect("/financial/banking");
  }

  return (
    <BankTransactionsClient
      account={account}
      transactions={transactions}
      glTransactions={glTransactions}
      companyId={userCtx.companyId}
    />
  );
}
