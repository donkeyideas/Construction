import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getPropertyTransactions } from "@/lib/queries/section-transactions";
import { getTranslations } from "next-intl/server";
import SectionTransactions from "@/components/SectionTransactions";

export const metadata = {
  title: "Properties Transactions - Buildwrk",
};

export default async function PropertiesTransactionsPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/register");
  }

  const t = await getTranslations("properties");
  const txnData = await getPropertyTransactions(supabase, userCompany.companyId);

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
      <SectionTransactions data={txnData} sectionName="Properties" />
    </div>
  );
}
