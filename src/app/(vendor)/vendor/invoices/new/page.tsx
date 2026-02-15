import { Receipt } from "lucide-react";
import { getTranslations } from "next-intl/server";

export const metadata = { title: "Submit Invoice - Buildwrk" };

export default async function SubmitInvoicePage() {
  const t = await getTranslations("vendor");

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>{t("submitInvoiceTitle")}</h2>
          <p className="fin-header-sub">{t("submitInvoiceSubtitle")}</p>
        </div>
      </div>
      <div className="fin-chart-card">
        <div className="fin-empty">
          <div className="fin-empty-icon"><Receipt size={48} /></div>
          <div className="fin-empty-title">{t("comingSoon")}</div>
          <div className="fin-empty-desc">{t("underDevelopment")}</div>
        </div>
      </div>
    </div>
  );
}
