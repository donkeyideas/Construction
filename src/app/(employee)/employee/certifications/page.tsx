import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getEmployeeCertifications } from "@/lib/queries/employee-portal";
import CertificationsClient from "./CertificationsClient";

export const metadata = { title: "My Certifications - Buildwrk" };

export default async function EmployeeCertificationsPage() {
  const supabase = await createClient();
  const userCtx = await getCurrentUserCompany(supabase);
  if (!userCtx) {
    redirect("/login");
  }

  const certifications = await getEmployeeCertifications(
    supabase,
    userCtx.userId,
    userCtx.companyId
  );

  return <CertificationsClient certifications={certifications} />;
}
