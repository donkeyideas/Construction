"use client";

import { PortalTopbar } from "@/components/layout/portal-topbar";
import "@/styles/app-shell.css";
import "@/styles/components.css";
import "@/styles/financial.css";
import "@/styles/employee-portal.css";
import "@/styles/vendor-portal.css";
import "@/styles/variant-corporate.css";

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="portal-layout">
      <PortalTopbar portalType="employee" />
      <main className="portal-main">{children}</main>
    </div>
  );
}
