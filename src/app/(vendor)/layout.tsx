"use client";

import { PortalTopbar } from "@/components/layout/portal-topbar";
import "@/styles/app-shell.css";
import "@/styles/components.css";
import "@/styles/financial.css";
import "@/styles/vendor-portal.css";

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="portal-layout">
      <PortalTopbar portalType="vendor" />
      <main className="portal-main">{children}</main>
    </div>
  );
}
