"use client";

import { useState } from "react";
import { SuperAdminSidebar } from "@/components/layout/super-admin-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import "@/styles/app-shell.css";
import "@/styles/components.css";
import "@/styles/admin.css";
import "@/styles/super-admin.css";
import "@/styles/tickets.css";
import "@/styles/content.css";
import "@/styles/variant-corporate.css";
import "@/styles/variant-corporate-shell.css";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const t = useTranslations("saNav");

  function getBreadcrumb(path: string): string {
    const segments = path.split("/").filter(Boolean);
    if (segments.length <= 1) return t("platformOverview");
    return segments
      .slice(1)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " "))
      .join(" / ");
  }

  return (
    <>
      <SuperAdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <Topbar
        breadcrumb={`${t("superAdmin")} / ${getBreadcrumb(pathname)}`}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />
      <main className="main">{children}</main>
    </>
  );
}
