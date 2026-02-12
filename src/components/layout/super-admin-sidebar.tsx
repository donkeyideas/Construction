"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Building2, Users, FileText,
  Globe, ArrowLeft, ChevronRight,
} from "lucide-react";
import {
  superAdminNavigation,
  superAdminBottomNav,
  type SuperAdminNavItem,
} from "@/types/super-admin-navigation";

const iconMap: Record<string, React.ElementType> = {
  "layout-dashboard": LayoutDashboard,
  "building-2": Building2,
  users: Users,
  "file-text": FileText,
  globe: Globe,
  "arrow-left": ArrowLeft,
};

function NavItemComponent({ item }: { item: SuperAdminNavItem }) {
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

interface SuperAdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SuperAdminSidebar({ isOpen, onClose }: SuperAdminSidebarProps) {
  return (
    <>
      {isOpen && <div className="overlay active" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <h1>ConstructionERP</h1>
          <div className="accent-line" />
          <span className="sa-badge">Platform Admin</span>
        </div>
        <nav className="sidebar-nav">
          {superAdminNavigation.map((item) => (
            <NavItemComponent key={item.label} item={item} />
          ))}
        </nav>
        <div className="sidebar-bottom">
          {superAdminBottomNav.map((item) => (
            <NavItemComponent key={item.label} item={item} />
          ))}
        </div>
      </aside>
    </>
  );
}
