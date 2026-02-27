import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getEquipmentTransactions } from "@/lib/queries/section-transactions";
import SectionTransactions from "@/components/SectionTransactions";
import { getTranslations } from "next-intl/server";

export const metadata = {
  title: "Equipment Transactions - Buildwrk",
};

export default async function EquipmentTransactionsPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/login");
  }

  const t = await getTranslations("equipment");
  const txnData = await getEquipmentTransactions(supabase, userCompany.companyId);

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>{t("equipTransactionsTitle")}</h2>
          <p className="fin-header-sub">
            {t("equipTransactionsSubtitle")}
          </p>
        </div>
      </div>
      <SectionTransactions data={txnData} sectionName="Equipment" />
    </div>
  );
}
