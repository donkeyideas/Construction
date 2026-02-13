import { redirect } from "next/navigation";
import { Megaphone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getTenantAnnouncements } from "@/lib/queries/tenant-portal";

export const metadata = {
  title: "Announcements - ConstructionERP",
};

export default async function TenantAnnouncementsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login/tenant");
  }

  const announcements = await getTenantAnnouncements(supabase, user.id);

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
          <h2>Announcements</h2>
          <p className="fin-header-sub">
            Stay informed with the latest announcements from your property management.
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
                  {announcement.title ?? "Untitled"}
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
                Published{" "}
                {announcement.published_at
                  ? new Date(announcement.published_at).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "--"}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="fin-chart-card">
          <div className="fin-empty">
            <div className="fin-empty-icon"><Megaphone size={48} /></div>
            <div className="fin-empty-title">No Announcements</div>
            <div className="fin-empty-desc">
              There are no announcements at this time. Check back later for updates from your property management.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
