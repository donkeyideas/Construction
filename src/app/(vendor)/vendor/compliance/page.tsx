import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getVendorCertifications } from "@/lib/queries/vendor-portal";

export const metadata = { title: "Compliance - ConstructionERP" };

export default async function VendorCompliancePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { redirect("/login/vendor"); }

  const certifications = await getVendorCertifications(supabase, user.id);

  function getCertStatus(expiryDate: string): { label: string; className: string } {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    if (expiry < now) {
      return { label: "Expired", className: "inv-status inv-status-overdue" };
    }
    if (expiry <= thirtyDaysFromNow) {
      return { label: "Expiring Soon", className: "inv-status inv-status-pending" };
    }
    return { label: "Valid", className: "inv-status inv-status-paid" };
  }

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>Compliance</h2>
          <p className="fin-header-sub">Manage your certifications and compliance documents.</p>
        </div>
      </div>

      {certifications.length > 0 ? (
        <div className="fin-chart-card" style={{ padding: 0 }}>
          <div style={{ overflowX: "auto" }}>
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>Certification Name</th>
                  <th>Type</th>
                  <th>Expiry Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {certifications.map((cert: Record<string, unknown>) => {
                  const status = cert.expiry_date
                    ? getCertStatus(cert.expiry_date as string)
                    : { label: "Unknown", className: "inv-status" };

                  return (
                    <tr key={cert.id as string}>
                      <td style={{ fontWeight: 600 }}>
                        {(cert.cert_name as string) ?? "Unnamed"}
                      </td>
                      <td style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                        {(cert.cert_type as string) ?? "--"}
                      </td>
                      <td>
                        {cert.expiry_date
                          ? new Date(cert.expiry_date as string).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "--"}
                      </td>
                      <td>
                        <span className={status.className}>
                          {status.label}
                        </span>
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
            <div className="fin-empty-icon"><ShieldCheck size={48} /></div>
            <div className="fin-empty-title">No Certifications Found</div>
            <div className="fin-empty-desc">You do not have any certifications on record.</div>
          </div>
        </div>
      )}
    </div>
  );
}
