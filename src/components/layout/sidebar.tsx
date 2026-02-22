"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, HardHat, Building2, DollarSign, FolderOpen,
  Users, Handshake, Sparkles, BarChart3, Settings, ChevronRight,
  CalendarDays, Inbox, Ticket, Map, ShieldCheck, Wrench, FileText,
} from "lucide-react";
import { appNavigation, appBottomNav, type NavItem } from "@/types/navigation";
import { createClient } from "@/lib/supabase/client";
import CompanySwitcher from "@/components/CompanySwitcher";
import { useTranslations } from "next-intl";
import { getImportBadges, isImportComplete, type ImportProgress } from "@/lib/utils/import-guide";
import { MODULE_NAV_MAP, ALWAYS_VISIBLE_NAV, type ModuleKey } from "@/lib/constants/modules";

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
  "shield-check": ShieldCheck,
  wrench: Wrench,
  "file-text": FileText,
};

// Role-based navigation access control
// Maps roles to allowed top-level nav labels. '*' means all access.
const ROLE_NAV_ACCESS: Record<string, string[]> = {
  owner: ["*"],
  admin: ["*"],
  project_manager: [
    "Dashboard", "Calendar", "Inbox", "Tickets", "Contracts",
    "Projects", "Properties", "Safety", "Equipment", "Documents",
    "People", "CRM & Bids", "Reports",
  ],
  superintendent: [
    "Dashboard", "Calendar", "Inbox", "Tickets",
    "Projects", "Safety", "Equipment", "Documents", "Reports",
  ],
  accountant: [
    "Dashboard", "Calendar", "Inbox", "Tickets", "Contracts",
    "Financial", "Documents", "Reports",
  ],
  field_worker: [
    "Dashboard", "Calendar", "Inbox", "Tickets",
    "Projects", "Safety", "Equipment",
  ],
  viewer: [
    "Dashboard", "Calendar", "Inbox",
    "Projects", "Documents", "Reports",
  ],
};

function filterNavByRole(items: NavItem[], role: string | null): NavItem[] {
  if (!role) return items; // show all while loading
  const allowed = ROLE_NAV_ACCESS[role];
  if (!allowed || allowed.includes("*")) return items;
  return items.filter((item) => allowed.includes(item.label));
}

function filterNavByModules(items: NavItem[], modules: string[] | null): NavItem[] {
  if (!modules || modules.length === 0) return items; // null/empty = show all
  const allowedLabels = new Set(ALWAYS_VISIBLE_NAV);
  for (const mod of modules) {
    const labels = MODULE_NAV_MAP[mod as ModuleKey];
    if (labels) labels.forEach((l) => allowedLabels.add(l));
  }
  return items.filter((item) => allowedLabels.has(item.label));
}

function safeT(t: (key: string) => string, key: string): string {
  try {
    const result = t(key);
    // next-intl returns "namespace.key" when the key is missing — fall back to raw label
    if (result.startsWith("nav.")) return key;
    return result;
  } catch {
    return key;
  }
}

function NavItemComponent({
  item,
  t,
  badge,
  importBadges,
}: {
  item: NavItem;
  t: (key: string) => string;
  badge?: number;
  importBadges?: Map<string, number>;
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
          <span className="label">{safeT(t, item.label)}</span>
          <ChevronRight
            className="chevron"
            style={{ transform: open ? "rotate(90deg)" : undefined }}
          />
        </button>
        {open && (
          <div className="nav-children">
            {item.children.map((child) => {
              const childBadge = importBadges?.get(child.href);
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  className={`nav-child ${pathname === child.href ? "active" : ""}`}
                >
                  {safeT(t, child.label)}
                  {childBadge != null && (
                    <span className="nav-import-badge">{childBadge}</span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="nav-item">
      <Link href={item.href!} className={`nav-link ${isActive ? "active" : ""}`}>
        <Icon />
        <span className="label">{safeT(t, item.label)}</span>
        {badge != null && badge > 0 && (
          <span className="nav-badge">{badge > 99 ? "99+" : badge}</span>
        )}
      </Link>
    </div>
  );
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const t = useTranslations("nav");
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [selectedModules, setSelectedModules] = useState<string[] | null>(null);
  const [inboxUnread, setInboxUnread] = useState(0);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);

  useEffect(() => {
    async function fetchCompanyAndRole() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: member } = await supabase
          .from("company_members")
          .select("company_id, role")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .limit(1)
          .single();

        if (!member) return;

        setUserRole(member.role);

        const { data: company } = await supabase
          .from("companies")
          .select("name, logo_url, import_progress, selected_modules")
          .eq("id", member.company_id)
          .single();

        if (company) {
          setCompanyName(company.name);
          setLogoUrl(company.logo_url);
          if (company.import_progress) {
            setImportProgress(company.import_progress as ImportProgress);
          }
          if (company.selected_modules) {
            setSelectedModules(company.selected_modules as string[]);
          }
        }

        // Fetch unread count for inbox badge
        const [msgRes, notifRes] = await Promise.all([
          supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("recipient_id", user.id)
            .eq("is_read", false)
            .eq("is_archived", false),
          supabase
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("is_read", false),
        ]);
        setInboxUnread((msgRes.count ?? 0) + (notifRes.count ?? 0));
      } catch {
        // silent - fall back to default brand
      }
    }

    fetchCompanyAndRole();
  }, []);

  const filteredNav = useMemo(
    () => filterNavByModules(filterNavByRole(appNavigation, userRole), selectedModules),
    [userRole, selectedModules]
  );

  const filteredBottomNav = useMemo(
    () => filterNavByModules(filterNavByRole(appBottomNav, userRole), selectedModules),
    [userRole, selectedModules]
  );

  const importBadgeMap = useMemo(() => {
    if (isImportComplete(importProgress)) return undefined;
    return getImportBadges(importProgress);
  }, [importProgress]);

  return (
    <>
      {isOpen && <div className="overlay active" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          {companyName ? (
            logoUrl ? (
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <img
                  src={logoUrl}
                  alt=""
                  style={{
                    width: "28px",
                    height: "28px",
                    objectFit: "contain",
                    borderRadius: "4px",
                  }}
                />
                <h1 style={{ fontSize: companyName.length > 18 ? "0.95rem" : undefined }}>
                  {companyName}
                </h1>
              </div>
            ) : (
              <h1>{companyName}</h1>
            )
          ) : (
            <div
              style={{
                height: "1.4rem",
                width: "140px",
                borderRadius: "6px",
                background: "var(--border)",
                opacity: 0.5,
              }}
            />
          )}
          <div className="accent-line" />
        </div>
        <CompanySwitcher />
        <nav className="sidebar-nav">
          {filteredNav.map((item) => (
            <NavItemComponent
              key={item.label}
              item={item}
              t={t}
              badge={item.label === "Inbox" ? inboxUnread : undefined}
              importBadges={importBadgeMap}
            />
          ))}
        </nav>
        <div className="sidebar-bottom">
          {filteredBottomNav.map((item) => (
            <NavItemComponent key={item.label} item={item} t={t} />
          ))}
        </div>
      </aside>
    </>
  );
}
