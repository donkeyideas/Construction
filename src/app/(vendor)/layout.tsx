"use client";

import { useState } from "react";
import { VendorSidebar } from "@/components/layout/vendor-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { usePathname } from "next/navigation";
import "@/styles/app-shell.css";
import "@/styles/components.css";
import "@/styles/financial.css";
import "@/styles/vendor-portal.css";

function getBreadcrumb(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length <= 1) return "Vendor Portal";
  return "Vendor / " + segments.slice(1)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " "))
    .join(" / ");
}

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <VendorSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Topbar
        breadcrumb={getBreadcrumb(pathname)}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />
      <main className="main">{children}</main>
    </>
  );
}
