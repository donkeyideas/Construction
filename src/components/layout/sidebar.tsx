"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, HardHat, Building2, DollarSign, FolderOpen,
  Users, Handshake, Sparkles, BarChart3, Settings, ChevronRight,
  CalendarDays, Inbox, Ticket, Map,
} from "lucide-react";
import { appNavigation, appBottomNav, type NavItem } from "@/types/navigation";

const iconMap: Record<string, React.ElementType> = {
  "layout-dashboard": LayoutDashboard,
  "hard-hat": HardHat,
  "building-2": Building2,
  "dollar-sign": DollarSign,
  "folder-open": FolderOpen,
  users: Users,
  handshake: Handshake,
  sparkles: Sparkles,
  "bar-chart-3": BarChart3,
  settings: Settings,
  "calendar-days": CalendarDays,
  inbox: Inbox,
  ticket: Ticket,
  map: Map,
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

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {isOpen && <div className="overlay active" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <h1>ConstructionERP</h1>
          <div className="accent-line" />
        </div>
        <nav className="sidebar-nav">
          {appNavigation.map((item) => (
            <NavItemComponent key={item.label} item={item} />
          ))}
        </nav>
        <div className="sidebar-bottom">
          {appBottomNav.map((item) => (
            <NavItemComponent key={item.label} item={item} />
          ))}
        </div>
      </aside>
    </>
  );
}
