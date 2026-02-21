import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVendorContact, getVendorCertifications } from "@/lib/queries/vendor-portal";
import ProfileClient from "./ProfileClient";

export const metadata = { title: "My Profile - Buildwrk" };

export default async function VendorProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login/vendor");

  const admin = createAdminClient();
  const [contact, certifications] = await Promise.all([
    getVendorContact(admin, user.id),
    getVendorCertifications(admin, user.id),
  ]);

  if (!contact) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-title">Profile Not Found</div>
        <div className="fin-empty-desc">Your vendor profile could not be loaded.</div>
      </div>
    );
  }

  return (
    <ProfileClient
      contact={{
        id: contact.id,
        company_name: contact.company_name,
        first_name: contact.first_name,
        last_name: contact.last_name,
        email: contact.email,
        phone: contact.phone,
        job_title: contact.job_title,
      }}
      certifications={(certifications ?? []).map((c: Record<string, unknown>) => ({
        id: c.id as string,
        cert_name: (c.cert_name as string) ?? "",
        cert_type: (c.cert_type as string) ?? null,
        expiry_date: (c.expiry_date as string) ?? null,
      }))}
    />
  );
}
