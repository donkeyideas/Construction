import { redirect } from "next/navigation";
import { HardHat } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getVendorProjects } from "@/lib/queries/vendor-portal";
import { getTranslations, getLocale } from "next-intl/server";

export const metadata = { title: "My Projects - Buildwrk" };

export default async function VendorProjectsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { redirect("/login/vendor"); }

  const contractProjects = await getVendorProjects(supabase, user.id);
  const t = await getTranslations("vendor");
  const locale = await getLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>{t("projectsTitle")}</h2>
          <p className="fin-header-sub">{t("projectsSubtitle")}</p>
        </div>
      </div>

      {contractProjects.length > 0 ? (
        <div className="fin-chart-card" style={{ padding: 0 }}>
          <div style={{ overflowX: "auto" }}>
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>{t("thProjectName")}</th>
                  <th>{t("thStatus")}</th>
                  <th>{t("thStartDate")}</th>
                  <th>{t("thEndDate")}</th>
                </tr>
              </thead>
              <tbody>
                {contractProjects.map((item: Record<string, unknown>) => {
                  const project = item.projects as {
                    id: string;
                    name: string;
                    status: string;
                    start_date: string | null;
                    end_date: string | null;
                  } | null;
                  if (!project) return null;

                  return (
                    <tr key={project.id}>
                      <td style={{ fontWeight: 600 }}>
                        <a
                          href={`/vendor/projects/${project.id}`}
                          style={{ color: "var(--color-blue)", textDecoration: "none" }}
                        >
                          {project.name}
                        </a>
                      </td>
                      <td>
                        <span className={`inv-status inv-status-${project.status}`}>
                          {project.status}
                        </span>
                      </td>
                      <td>
                        {project.start_date
                          ? new Date(project.start_date).toLocaleDateString(dateLocale, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "--"}
                      </td>
                      <td>
                        {project.end_date
                          ? new Date(project.end_date).toLocaleDateString(dateLocale, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "--"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="fin-chart-card">
          <div className="fin-empty">
            <div className="fin-empty-icon"><HardHat size={48} /></div>
            <div className="fin-empty-title">{t("noProjectsFound")}</div>
            <div className="fin-empty-desc">{t("noProjectsDesc")}</div>
          </div>
        </div>
      )}
    </div>
  );
}
