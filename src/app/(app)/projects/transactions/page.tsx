import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getProjectTransactions } from "@/lib/queries/section-transactions";
import SectionTransactions from "@/components/SectionTransactions";
import { getTranslations } from "next-intl/server";

export const metadata = {
  title: "Projects Transactions - Buildwrk",
};

export default async function ProjectsTransactionsPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);
  const t = await getTranslations("projects");

  if (!userCompany) {
    redirect("/register");
  }

  const txnData = await getProjectTransactions(supabase, userCompany.companyId);

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
      <SectionTransactions data={txnData} sectionName="Projects" />
    </div>
  );
}
