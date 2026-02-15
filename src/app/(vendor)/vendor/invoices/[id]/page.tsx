import { Receipt } from "lucide-react";
import { getTranslations } from "next-intl/server";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return { title: `Invoice ${id.substring(0, 8)} - Buildwrk` };
}

export default async function InvoiceDetailPage({ params }: PageProps) {
  const { id } = await params;
  const t = await getTranslations("vendor");

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>{t("invoiceDetailTitle")}</h2>
          <p className="fin-header-sub">{t("invoiceDetailSubtitle", { id: id.substring(0, 8) })}</p>
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
