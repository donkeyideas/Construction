"use client";

import { useState } from "react";
import { AdminDashboardSidebar } from "@/components/layout/admin-dashboard-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { usePathname } from "next/navigation";
import "@/styles/app-shell.css";
import "@/styles/admin.css";
import "@/styles/components.css";
import "@/styles/financial.css";
import "@/styles/admin-dashboard.css";
import "@/styles/integrations.css";
import "@/styles/security.css";
import "@/styles/automation.css";

function getBreadcrumb(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return "Admin Panel";
  return segments
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " "))
    .join(" / ");
}

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <AdminDashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Topbar
        breadcrumb={getBreadcrumb(pathname)}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />
      <main className="main">{children}</main>
    </>
  );
}
