"use client";

import { PortalTopbar } from "@/components/layout/portal-topbar";
import "@/styles/app-shell.css";
import "@/styles/components.css";
import "@/styles/tenant-portal.css";
import "@/styles/vendor-portal.css";
import "@/styles/variant-corporate.css";

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="portal-layout">
      <PortalTopbar portalType="tenant" />
      <main className="portal-main">{children}</main>
    </div>
  );
}
