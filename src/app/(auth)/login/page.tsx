import PortalLoginForm from "@/components/auth/portal-login-form";

export default function LoginPage() {
  return (
    <PortalLoginForm
      portalType="executive"
      defaultRedirect="/dashboard"
      title="Welcome back"
      subtitle="Sign in to your Buildwrk account to continue."
      showRegisterLink
    />
  );
}
