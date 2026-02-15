import PortalLoginForm from "@/components/auth/portal-login-form";

export const metadata = {
  title: "Tenant Portal Login - Buildwrk",
};

export default function TenantLoginPage() {
  return (
    <PortalLoginForm
      portalType="tenant"
      defaultRedirect="/tenant"
      title="Tenant Portal"
      subtitle="Sign in to manage your lease, pay rent, and submit maintenance requests."
      noAccountMessage="Don't have an account? Contact your property manager for access."
    />
  );
}
