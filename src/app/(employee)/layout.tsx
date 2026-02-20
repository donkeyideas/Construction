"use client";

import { useState } from "react";
import { EmployeeSidebar } from "@/components/layout/employee-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import "@/styles/app-shell.css";
import "@/styles/components.css";
import "@/styles/financial.css";
import "@/styles/employee-portal.css";

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const t = useTranslations("employeeNav");

  function getBreadcrumb(path: string): string {
    const segments = path.split("/").filter(Boolean);
    if (segments.length <= 1) return t("employeePortal");
    return t("employeePortal") + " / " + segments.slice(1)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " "))
      .join(" / ");
  }

  return (
    <>
      <EmployeeSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Topbar
        breadcrumb={getBreadcrumb(pathname)}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />
      <main className="main">{children}</main>
    </>
  );
}
