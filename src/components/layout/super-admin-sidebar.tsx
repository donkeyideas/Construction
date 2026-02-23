"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Building2, Users, FileText,
  Globe, ChevronRight, CreditCard, Settings,
  Shield, Wrench, Headphones, TrendingUp, Mail,
} from "lucide-react";
import {
  superAdminNavigation,
  type SuperAdminNavItem,
} from "@/types/super-admin-navigation";
import { useTranslations } from "next-intl";

const iconMap: Record<string, React.ElementType> = {
  "layout-dashboard": LayoutDashboard,
  "building-2": Building2,
  users: Users,
  mail: Mail,
  "file-text": FileText,
  globe: Globe,
  "credit-card": CreditCard,
  shield: Shield,
  wrench: Wrench,
  headphones: Headphones,
  "trending-up": TrendingUp,
  settings: Settings,
};

function NavItemComponent({
  item,
  t,
  badge,
}: {
  item: SuperAdminNavItem;
  t: (key: string) => string;
  badge?: number;
}) {
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
        {badge != null && badge > 0 && (
          <span
            style={{
              marginLeft: "auto",
              background: "var(--color-red)",
              color: "#fff",
              fontSize: "0.7rem",
              fontWeight: 700,
              minWidth: 20,
              height: 20,
              borderRadius: 10,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 6px",
            }}
          >
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </Link>
    </div>
  );
}

interface SuperAdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SuperAdminSidebar({ isOpen, onClose }: SuperAdminSidebarProps) {
  const t = useTranslations("saNav");
  const pathname = usePathname();
  const [inboxNewCount, setInboxNewCount] = useState(0);

  useEffect(() => {
    fetch("/api/super-admin/inbox/count")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setInboxNewCount(data.newCount ?? 0);
      })
      .catch(() => {});
  }, [pathname]);

  return (
    <>
      {isOpen && <div className="overlay active" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <h1>Buildwrk</h1>
          <div className="accent-line" />
          <span className="sa-badge">{t("platformAdmin")}</span>
        </div>
        <nav className="sidebar-nav">
          {superAdminNavigation.map((item) => (
            <NavItemComponent
              key={item.label}
              item={item}
              t={t as any}
              badge={item.label === "inbox" ? inboxNewCount : undefined}
            />
          ))}
        </nav>
        <div className="sidebar-bottom" />
      </aside>
    </>
  );
}
