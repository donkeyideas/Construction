"use client";

import { useState } from "react";
import { SuperAdminSidebar } from "@/components/layout/super-admin-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { usePathname } from "next/navigation";
import "@/styles/app-shell.css";
import "@/styles/admin.css";
import "@/styles/super-admin.css";
import "@/styles/tickets.css";

function getBreadcrumb(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length <= 1) return "Platform Overview";
  return segments
    .slice(1)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " "))
    .join(" / ");
}

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <SuperAdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <Topbar
        breadcrumb={`Super Admin / ${getBreadcrumb(pathname)}`}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />
      <main className="main">{children}</main>
    </>
  );
}
