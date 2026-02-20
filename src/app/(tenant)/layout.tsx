"use client";

import { useState } from "react";
import { TenantSidebar } from "@/components/layout/tenant-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import "@/styles/app-shell.css";
import "@/styles/components.css";
import "@/styles/tenant-portal.css";

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const t = useTranslations("tenantNav");

  function getBreadcrumb(path: string): string {
    const segments = path.split("/").filter(Boolean);
    if (segments.length <= 1) return t("tenantPortal");
    return t("tenantPortal") + " / " + segments.slice(1)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " "))
      .join(" / ");
  }

  return (
    <>
      <TenantSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Topbar
        breadcrumb={getBreadcrumb(pathname)}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />
      <main className="main">{children}</main>
    </>
  );
}
