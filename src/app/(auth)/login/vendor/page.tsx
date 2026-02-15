import PortalLoginForm from "@/components/auth/portal-login-form";

export const metadata = {
  title: "Vendor Portal Login - Buildwrk",
};

export default function VendorLoginPage() {
  return (
    <PortalLoginForm
      portalType="vendor"
      defaultRedirect="/vendor"
      title="Vendor Portal"
      subtitle="Sign in to track contracts, submit invoices, and manage compliance."
      noAccountMessage="Don't have an account? Contact the general contractor for access."
    />
  );
}
