"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Receipt,
  DollarSign,
  HardHat,
  FolderOpen,
  ShieldCheck,
  User,
  ChevronRight,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { vendorNavigation } from "@/types/vendor-navigation";
import type { NavItem } from "@/types/navigation";

const iconMap: Record<string, React.ElementType> = {
  "layout-dashboard": LayoutDashboard,
  "file-text": FileText,
  receipt: Receipt,
  "dollar-sign": DollarSign,
  "hard-hat": HardHat,
  "folder-open": FolderOpen,
  "shield-check": ShieldCheck,
  user: User,
};

function NavItemComponent({ item, t }: { item: NavItem; t: (key: string) => string }) {
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
          <span className="label">{(t as any)(item.label)}</span>
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
                {(t as any)(child.label)}
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
        <span className="label">{(t as any)(item.label)}</span>
      </Link>
    </div>
  );
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VendorSidebar({ isOpen, onClose }: SidebarProps) {
  const t = useTranslations("vendorNav");

  return (
    <>
      {isOpen && <div className="overlay active" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <h1>{t("vendorPortal")}</h1>
          <div className="accent-line" />
        </div>
        <nav className="sidebar-nav">
          {vendorNavigation.map((item) => (
            <NavItemComponent key={item.label} item={item} t={t as any} />
          ))}
        </nav>
      </aside>
    </>
  );
}
