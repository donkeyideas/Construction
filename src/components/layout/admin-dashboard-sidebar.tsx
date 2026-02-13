"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Building2, ChevronRight,
  Sparkles, Key, Truck, ScrollText, ArrowLeft, FileText, Receipt,
  Shield, Zap,
} from "lucide-react";
import { adminDashboardNavigation, adminDashboardBottomNav } from "@/types/admin-dashboard-navigation";
import type { NavItem } from "@/types/navigation";

const iconMap: Record<string, React.ElementType> = {
  "layout-dashboard": LayoutDashboard,
  users: Users,
  "building-2": Building2,
  sparkles: Sparkles,
  key: Key,
  truck: Truck,
  "scroll-text": ScrollText,
  "arrow-left": ArrowLeft,
  "file-text": FileText,
  receipt: Receipt,
  shield: Shield,
  zap: Zap,
};

function NavItemComponent({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const Icon = iconMap[item.icon] || LayoutDashboard;
  const isActive = item.href
    ? pathname === item.href
    : item.children?.some((c) => pathname.startsWith(c.href));

  if (item.children) {
    return (
      <div className="nav-item">
        <button
          onClick={() => setOpen(!open)}
          className={`nav-link ${isActive ? "active" : ""}`}
        >
          <Icon />
          <span className="label">{item.label}</span>
          <ChevronRight
            className="chevron"
            style={{ transform: open ? "rotate(90deg)" : undefined }}
          />
        </button>
        {open && (
          <div className="nav-children">
            {item.children.map((child) => (
              <Link
                key={child.href}
                href={child.href}
                className={`nav-child ${pathname === child.href ? "active" : ""}`}
              >
                {child.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="nav-item">
      <Link href={item.href!} className={`nav-link ${isActive ? "active" : ""}`}>
        <Icon />
        <span className="label">{item.label}</span>
      </Link>
    </div>
  );
}

interface AdminDashboardSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminDashboardSidebar({ isOpen, onClose }: AdminDashboardSidebarProps) {
  return (
    <>
      {isOpen && <div className="overlay active" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <h1>Administration</h1>
          <div className="accent-line" />
        </div>
        <nav className="sidebar-nav">
          {adminDashboardNavigation.map((item) => (
            <NavItemComponent key={item.label} item={item} />
          ))}
        </nav>
        <div className="sidebar-bottom">
          {adminDashboardBottomNav.map((item) => (
            <NavItemComponent key={item.label} item={item} />
          ))}
        </div>
      </aside>
    </>
  );
}
