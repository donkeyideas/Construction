"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { usePathname } from "next/navigation";
import "@/styles/app-shell.css";
import "@/styles/dashboard.css";
import "@/styles/components.css";
import "@/styles/projects.css";
import "@/styles/properties.css";
import "@/styles/financial.css";
import "@/styles/crm.css";
import "@/styles/people.css";
import "@/styles/documents.css";
import "@/styles/reports.css";
import "@/styles/admin.css";
import "@/styles/content.css";
import "@/styles/ai-chat.css";
import "@/styles/ai.css";
import "@/styles/calendar.css";
import "@/styles/inbox.css";
import "@/styles/tickets.css";
import "@/styles/system-map.css";
import "@/styles/safety.css";
import "@/styles/equipment.css";
import "@/styles/banking.css";
import "@/styles/contracts.css";
import "@/styles/import-modal.css";
import "@/styles/plan-room.css";
import "@/styles/security.css";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getBreadcrumb(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return "Dashboard";
  return segments
    .filter((s) => !UUID_RE.test(s))
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " "))
    .join(" / ");
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Topbar
        breadcrumb={getBreadcrumb(pathname)}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />
      <main className="main">{children}</main>
    </>
  );
}
