import { HardHat } from "lucide-react";
import { getTranslations } from "next-intl/server";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return { title: `Project ${id.substring(0, 8)} - Buildwrk` };
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { id } = await params;
  const t = await getTranslations("vendor");

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>{t("projectDetailTitle")}</h2>
          <p className="fin-header-sub">{t("projectDetailSubtitle", { id: id.substring(0, 8) })}</p>
        </div>
      </div>
      <div className="fin-chart-card">
        <div className="fin-empty">
          <div className="fin-empty-icon"><HardHat size={48} /></div>
          <div className="fin-empty-title">{t("comingSoon")}</div>
          <div className="fin-empty-desc">{t("underDevelopment")}</div>
        </div>
      </div>
    </div>
  );
}
