import { redirect } from "next/navigation";
import { HardHat } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getVendorProjects } from "@/lib/queries/vendor-portal";

export const metadata = { title: "My Projects - ConstructionERP" };

export default async function VendorProjectsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { redirect("/login/vendor"); }

  const contractProjects = await getVendorProjects(supabase, user.id);

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>My Projects</h2>
          <p className="fin-header-sub">Projects where you have active contracts.</p>
        </div>
      </div>

      {contractProjects.length > 0 ? (
        <div className="fin-chart-card" style={{ padding: 0 }}>
          <div style={{ overflowX: "auto" }}>
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>Project Name</th>
                  <th>Status</th>
                  <th>Start Date</th>
                  <th>End Date</th>
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
                          ? new Date(project.start_date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "--"}
                      </td>
                      <td>
                        {project.end_date
                          ? new Date(project.end_date).toLocaleDateString("en-US", {
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
            <div className="fin-empty-title">No Projects Found</div>
            <div className="fin-empty-desc">You do not have any active project assignments yet.</div>
          </div>
        </div>
      )}
    </div>
  );
}
