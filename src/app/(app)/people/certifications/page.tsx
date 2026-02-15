import { Award } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import CertificationsClient from "./CertificationsClient";

export const metadata = {
  title: "Certifications - Buildwrk",
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

  return (
    <div>
      <CertificationsClient
        certs={filteredCerts}
        totalCerts={totalCerts}
        validCount={validCount}
        expiringSoonCount={expiringSoonCount}
        expiredCount={expiredCount}
        activeStatus={activeStatus}
      />
    </div>
  );
}
