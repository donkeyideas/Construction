import PortalLoginForm from "@/components/auth/portal-login-form";

export const metadata = {
  title: "Admin Login - Buildwrk",
};

export default function AdminLoginPage() {
  return (
    <PortalLoginForm
      portalType="admin"
      defaultRedirect="/admin-panel"
      title="Administration"
      subtitle="Sign in to manage your team, tenants, vendors, and company settings."
    />
  );
}
