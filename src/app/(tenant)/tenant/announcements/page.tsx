import { redirect } from "next/navigation";
import { Megaphone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getTenantAnnouncements } from "@/lib/queries/tenant-portal";
import { getTranslations, getLocale } from "next-intl/server";
import { formatDateLong } from "@/lib/utils/format";

export const metadata = {
  title: "Announcements - Buildwrk",
};

export default async function TenantAnnouncementsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login/tenant");
  }

  const [announcements, t, locale] = await Promise.all([
    getTenantAnnouncements(supabase, user.id),
    getTranslations("tenant"),
    getLocale(),
  ]);

  const dateLocale = locale === "es" ? "es" : "en-US";

  function getCategoryBadge(category: string | null): string {
    switch (category) {
      case "urgent":
        return "badge badge-red";
      case "maintenance":
        return "badge badge-amber";
      case "event":
        return "badge badge-blue";
      case "general":
        return "badge badge-green";
      default:
        return "badge badge-blue";
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>{t("announcementsTitle")}</h2>
          <p className="fin-header-sub">
            {t("announcementsSubtitle")}
          </p>
        </div>
      </div>

      {announcements.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {announcements.map((announcement) => (
            <div key={announcement.id} className="card" style={{ padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 12 }}>
                <h3 style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "1.05rem",
                  fontWeight: 600,
                  margin: 0,
                }}>
                  {announcement.title ?? t("untitled")}
                </h3>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                  {announcement.category && (
                    <span className={getCategoryBadge(announcement.category)}>
                      {announcement.category}
                    </span>
                  )}
                </div>
              </div>
              {announcement.content && (
                <div style={{
                  fontSize: "0.88rem",
                  color: "var(--muted)",
                  lineHeight: 1.6,
                  marginBottom: 12,
                }}>
                  {announcement.content.length > 300
                    ? announcement.content.substring(0, 300) + "..."
                    : announcement.content}
                </div>
              )}
              <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                {t("published", {
                  date: announcement.published_at
                    ? formatDateLong(announcement.published_at)
                    : "--",
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="fin-chart-card">
          <div className="fin-empty">
            <div className="fin-empty-icon"><Megaphone size={48} /></div>
            <div className="fin-empty-title">{t("noAnnouncementsTitle")}</div>
            <div className="fin-empty-desc">
              {t("noAnnouncementsDesc")}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
