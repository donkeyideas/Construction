import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getFinancialTransactions } from "@/lib/queries/section-transactions";
import { DollarSign } from "lucide-react";
import SectionTransactions from "@/components/SectionTransactions";
import { getTranslations } from "next-intl/server";

export const metadata = {
  title: "Financial Transactions - Buildwrk",
};

export default async function FinancialTransactionsPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);
  const t = await getTranslations("financial");

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon"><DollarSign size={48} /></div>
        <div className="fin-empty-title">{t("noCompanyFound")}</div>
        <div className="fin-empty-desc">{t("completeRegistration")}</div>
      </div>
    );
  }

  const txnData = await getFinancialTransactions(supabase, userCompany.companyId);

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>{t("transactionsTitle")}</h2>
          <p className="fin-header-sub">
            {t("transactionsSubtitle")}
          </p>
        </div>
      </div>
      <SectionTransactions data={txnData} sectionName="Financial" />
    </div>
  );
}
