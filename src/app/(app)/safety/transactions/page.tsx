import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getSafetyTransactions } from "@/lib/queries/section-transactions";
import SectionTransactions from "@/components/SectionTransactions";
import { getTranslations } from "next-intl/server";

export const metadata = {
  title: "Safety Transactions - Buildwrk",
};

export default async function SafetyTransactionsPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/login");
  }

  const t = await getTranslations("safety");
  const txnData = await getSafetyTransactions(supabase, userCompany.companyId);

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>{t("safetyTransactionsTitle")}</h2>
          <p className="fin-header-sub">
            {t("safetyTransactionsSubtitle")}
          </p>
        </div>
      </div>
      <SectionTransactions data={txnData} sectionName="Safety" />
    </div>
  );
}
