import PortalLoginForm from "@/components/auth/portal-login-form";

export const metadata = {
  title: "Employee Portal Login - Buildwrk",
};

export default function EmployeeLoginPage() {
  return (
    <PortalLoginForm
      portalType="employee"
      defaultRedirect="/employee"
      title="Employee Portal"
      subtitle="Sign in to track your time, view payslips, and manage your profile."
      noAccountMessage="Don't have an account? Contact your company admin for access."
    />
  );
}
