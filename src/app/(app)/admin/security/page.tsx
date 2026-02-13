import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

export const metadata = { title: "Security & Audit - ConstructionERP" };

export default async function SecurityPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);
  if (!userCompany) redirect("/register");

  const { companyId } = userCompany;

  const { data: auditLogs } = await supabase
    .from("audit_log")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(50);

  const logs = auditLogs ?? [];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Security &amp; Audit</h1>
          <p className="page-subtitle">Security settings and activity log</p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <div
          className="card"
          style={{
            padding: "1.25rem",
            border: "1px solid var(--border)",
            borderRadius: 8,
            background: "var(--card-bg)",
          }}
        >
          <h3 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>
            Password Policy
          </h3>
          <div
            style={{
              fontSize: "0.85rem",
              color: "var(--text-secondary)",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
          >
            <div>
              Minimum length: <strong>8 characters</strong>
            </div>
            <div>
              Require uppercase: <strong>Yes</strong>
            </div>
            <div>
              Require number: <strong>Yes</strong>
            </div>
            <div>
              Require special character: <strong>Yes</strong>
            </div>
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: "1.25rem",
            border: "1px solid var(--border)",
            borderRadius: 8,
            background: "var(--card-bg)",
          }}
        >
          <h3 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>
            Session Settings
          </h3>
          <div
            style={{
              fontSize: "0.85rem",
              color: "var(--text-secondary)",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
          >
            <div>
              Session timeout: <strong>24 hours</strong>
            </div>
            <div>
              Two-factor auth: <strong>Optional</strong>
            </div>
            <div>
              Max sessions per user: <strong>5</strong>
            </div>
            <div>
              IP allowlisting: <strong>Disabled</strong>
            </div>
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: "1.15rem", marginBottom: "1rem" }}>Audit Log</h2>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  style={{
                    textAlign: "center",
                    padding: "2rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  No audit log entries
                </td>
              </tr>
            ) : (
              logs.map(
                (log: {
                  id: string;
                  created_at: string;
                  action: string;
                  entity_type: string;
                  details: Record<string, string> | null;
                }) => (
                  <tr key={log.id}>
                    <td>
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td style={{ textTransform: "capitalize" }}>
                      {log.action?.replace(/_/g, " ")}
                    </td>
                    <td style={{ textTransform: "capitalize" }}>
                      {log.entity_type?.replace(/_/g, " ")}
                    </td>
                    <td>
                      {log.details?.name || log.details?.ref || "—"}
                    </td>
                  </tr>
                )
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
