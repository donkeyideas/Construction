import Link from "next/link";
import {
  Award,
  ShieldCheck,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

export const metadata = {
  title: "Certifications - ConstructionERP",
};

interface PageProps {
  searchParams: Promise<{
    status?: string;
  }>;
}

type CertStatus = "valid" | "expiring_soon" | "expired";

export default async function CertificationsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon"><Award size={48} /></div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">Please complete registration to access certifications.</div>
      </div>
    );
  }

  const { companyId } = userCompany;
  const activeStatus = params.status || "all";

  // Fetch certifications with joined contact info
  const { data: certs } = await supabase
    .from("certifications")
    .select("*, contacts(first_name, last_name, company_name)")
    .eq("company_id", companyId)
    .order("expiry_date", { ascending: true });

  const allCerts = certs ?? [];

  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Compute dynamic status for each cert
  function computeStatus(expiryDate: string | null): CertStatus {
    if (!expiryDate) return "valid";
    const expiry = new Date(expiryDate);
    if (expiry < now) return "expired";
    if (expiry <= in30Days) return "expiring_soon";
    return "valid";
  }

  // Add computed status to each cert
  const certsWithStatus = allCerts.map((cert) => ({
    ...cert,
    computedStatus: computeStatus(cert.expiry_date),
  }));

  // KPIs (from full set, not filtered)
  const totalCerts = certsWithStatus.length;
  const validCount = certsWithStatus.filter((c) => c.computedStatus === "valid").length;
  const expiringSoonCount = certsWithStatus.filter((c) => c.computedStatus === "expiring_soon").length;
  const expiredCount = certsWithStatus.filter((c) => c.computedStatus === "expired").length;

  // Apply status filter
  const filteredCerts =
    activeStatus === "all"
      ? certsWithStatus
      : certsWithStatus.filter((c) => c.computedStatus === activeStatus);

  // Filter options
  const statusFilters = [
    { label: "All", value: "all" },
    { label: "Valid", value: "valid" },
    { label: "Expiring Soon", value: "expiring_soon" },
    { label: "Expired", value: "expired" },
  ];

  function buildUrl(status: string): string {
    if (status === "all") return "/people/certifications";
    return `/people/certifications?status=${status}`;
  }

  function getStatusBadge(status: CertStatus): string {
    switch (status) {
      case "valid":
        return "badge badge-green";
      case "expiring_soon":
        return "badge badge-amber";
      case "expired":
        return "badge badge-red";
      default:
        return "badge badge-green";
    }
  }

  function getStatusLabel(status: CertStatus): string {
    switch (status) {
      case "valid":
        return "Valid";
      case "expiring_soon":
        return "Expiring Soon";
      case "expired":
        return "Expired";
      default:
        return status;
    }
  }

  function getTypeBadge(certType: string): string {
    switch (certType) {
      case "osha_10":
      case "osha_30":
        return "badge badge-red";
      case "first_aid":
      case "cpr":
        return "badge badge-green";
      case "license":
        return "badge badge-blue";
      case "insurance":
        return "badge badge-amber";
      default:
        return "badge badge-blue";
    }
  }

  function formatCertType(certType: string): string {
    switch (certType) {
      case "osha_10":
        return "OSHA 10";
      case "osha_30":
        return "OSHA 30";
      case "first_aid":
        return "First Aid";
      case "cpr":
        return "CPR";
      case "license":
        return "License";
      case "insurance":
        return "Insurance";
      default:
        return certType;
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>Certifications & Licenses</h2>
          <p className="fin-header-sub">
            Track worker certifications, licenses, and expiration dates
          </p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="financial-kpi-row">
        <div className="fin-kpi">
          <div className="fin-kpi-icon blue">
            <Award size={18} />
          </div>
          <span className="fin-kpi-label">Total Certifications</span>
          <span className="fin-kpi-value">{totalCerts}</span>
        </div>

        <div className="fin-kpi">
          <div className="fin-kpi-icon green">
            <ShieldCheck size={18} />
          </div>
          <span className="fin-kpi-label">Valid</span>
          <span className="fin-kpi-value">{validCount}</span>
        </div>

        <div className="fin-kpi">
          <div className="fin-kpi-icon amber">
            <AlertTriangle size={18} />
          </div>
          <span className="fin-kpi-label">Expiring Soon (30d)</span>
          <span className="fin-kpi-value">{expiringSoonCount}</span>
        </div>

        <div className="fin-kpi">
          <div className="fin-kpi-icon red">
            <XCircle size={18} />
          </div>
          <span className="fin-kpi-label">Expired</span>
          <span className="fin-kpi-value">{expiredCount}</span>
        </div>
      </div>

      {/* Status Filters */}
      <div className="fin-filters">
        <label style={{ fontSize: "0.82rem", color: "var(--muted)", fontWeight: 500 }}>
          Status:
        </label>
        {statusFilters.map((s) => (
          <Link
            key={s.value}
            href={buildUrl(s.value)}
            className={`ui-btn ui-btn-sm ${
              activeStatus === s.value ? "ui-btn-primary" : "ui-btn-outline"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {/* Certifications Table */}
      {filteredCerts.length > 0 ? (
        <div className="fin-chart-card" style={{ padding: 0 }}>
          <div style={{ overflowX: "auto" }}>
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Cert Name</th>
                  <th>Type</th>
                  <th>Issuing Authority</th>
                  <th>Cert Number</th>
                  <th>Issued Date</th>
                  <th>Expiry Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredCerts.map((cert) => {
                  const contact = cert.contacts as {
                    first_name: string;
                    last_name: string;
                    company_name: string;
                  } | null;
                  const personName = contact
                    ? `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim()
                    : "--";
                  const isExpired = cert.computedStatus === "expired";
                  const isExpiringSoon = cert.computedStatus === "expiring_soon";

                  return (
                    <tr
                      key={cert.id}
                      className={isExpired ? "invoice-row-overdue" : ""}
                    >
                      <td style={{ fontWeight: 600 }}>
                        {personName}
                        {contact?.company_name && (
                          <div style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 400 }}>
                            {contact.company_name}
                          </div>
                        )}
                      </td>
                      <td>{cert.cert_name ?? "--"}</td>
                      <td>
                        <span className={getTypeBadge(cert.cert_type)}>
                          {formatCertType(cert.cert_type)}
                        </span>
                      </td>
                      <td>{cert.issuing_authority ?? "--"}</td>
                      <td style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "0.82rem" }}>
                        {cert.cert_number ?? "--"}
                      </td>
                      <td>
                        {cert.issued_date
                          ? new Date(cert.issued_date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "--"}
                      </td>
                      <td>
                        <span
                          style={{
                            color: isExpired
                              ? "var(--color-red)"
                              : isExpiringSoon
                                ? "var(--color-amber)"
                                : "var(--text)",
                            fontWeight: isExpired || isExpiringSoon ? 600 : 400,
                          }}
                        >
                          {cert.expiry_date
                            ? new Date(cert.expiry_date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "No Expiry"}
                          {isExpiringSoon && (
                            <AlertTriangle
                              size={12}
                              style={{ marginLeft: "4px", verticalAlign: "middle" }}
                            />
                          )}
                        </span>
                      </td>
                      <td>
                        <span className={getStatusBadge(cert.computedStatus)}>
                          {getStatusLabel(cert.computedStatus)}
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
            <div className="fin-empty-icon">
              <Award size={48} />
            </div>
            <div className="fin-empty-title">No Certifications Found</div>
            <div className="fin-empty-desc">
              {activeStatus !== "all"
                ? "No certifications match the current filter. Try adjusting your status filter."
                : "No certifications have been recorded yet. Add certifications to track compliance and expiration dates."}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
