import { redirect } from "next/navigation";
import Link from "next/link";
import { Wrench, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getTenantMaintenanceRequests } from "@/lib/queries/tenant-portal";

export const metadata = {
  title: "Maintenance Requests - ConstructionERP",
};

export default async function TenantMaintenancePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login/tenant");
  }

  const requests = await getTenantMaintenanceRequests(supabase, user.id);

  function getStatusBadge(status: string): string {
    switch (status) {
      case "open":
        return "badge badge-blue";
      case "in_progress":
        return "badge badge-amber";
      case "completed":
        return "badge badge-green";
      case "closed":
        return "badge badge-green";
      case "cancelled":
        return "badge badge-red";
      default:
        return "badge badge-blue";
    }
  }

  function getPriorityBadge(priority: string): string {
    switch (priority) {
      case "urgent":
        return "badge badge-red";
      case "high":
        return "badge badge-red";
      case "medium":
        return "badge badge-amber";
      case "low":
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
          <h2>Maintenance Requests</h2>
          <p className="fin-header-sub">
            Track your maintenance requests and their progress.
          </p>
        </div>
        <Link
          href="/tenant/maintenance/new"
          className="ui-btn ui-btn-md ui-btn-primary"
        >
          <Plus size={16} />
          Submit Request
        </Link>
      </div>

      {requests.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {requests.map((request) => (
            <div key={request.id} className="card" style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: 6 }}>
                    {request.title ?? "Untitled Request"}
                  </div>
                  {request.description && (
                    <div style={{ fontSize: "0.85rem", color: "var(--muted)", lineHeight: 1.5, marginBottom: 8 }}>
                      {request.description.length > 150
                        ? request.description.substring(0, 150) + "..."
                        : request.description}
                    </div>
                  )}
                  <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                    Submitted{" "}
                    {request.created_at
                      ? new Date(request.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "--"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {request.priority && (
                    <span className={getPriorityBadge(request.priority)}>
                      {request.priority}
                    </span>
                  )}
                  <span className={getStatusBadge(request.status)}>
                    {request.status?.replace("_", " ")}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="fin-chart-card">
          <div className="fin-empty">
            <div className="fin-empty-icon"><Wrench size={48} /></div>
            <div className="fin-empty-title">No Maintenance Requests</div>
            <div className="fin-empty-desc">
              You have not submitted any maintenance requests. Use the button above to report an issue.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
