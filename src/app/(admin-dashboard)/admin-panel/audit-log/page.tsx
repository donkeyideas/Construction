import { ScrollText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getAuditLog } from "@/lib/queries/admin-dashboard";

export const metadata = { title: "Audit Log - Buildwrk" };

export default async function AuditLogPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon"><ScrollText size={48} /></div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">Complete your company registration first.</div>
      </div>
    );
  }

  const logs = await getAuditLog(supabase, userCompany.companyId);

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>Audit Log</h2>
          <p className="fin-header-sub">Track all actions and changes made within your organization.</p>
        </div>
      </div>

      {logs.length > 0 ? (
        <div className="audit-table-wrap">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>User</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log: Record<string, unknown>) => (
                <tr key={log.id as string}>
                  <td className="audit-timestamp">
                    {log.created_at
                      ? new Date(log.created_at as string).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "--"}
                  </td>
                  <td className="audit-user">
                    {(log.user_id as string)?.slice(0, 8) ?? "--"}...
                  </td>
                  <td className="audit-action">{(log.action as string) ?? "--"}</td>
                  <td className="audit-entity">
                    {(log.entity_type as string) ?? "--"}
                    {log.entity_id ? ` #${(log.entity_id as string).slice(0, 8)}` : ""}
                  </td>
                  <td style={{ fontSize: "0.8rem", color: "var(--muted)", maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {log.details ? JSON.stringify(log.details) : "--"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="fin-chart-card">
          <div className="fin-empty">
            <div className="fin-empty-icon"><ScrollText size={48} /></div>
            <div className="fin-empty-title">No Audit Logs</div>
            <div className="fin-empty-desc">No activity has been recorded yet. Actions will appear here as they occur.</div>
          </div>
        </div>
      )}
    </div>
  );
}
