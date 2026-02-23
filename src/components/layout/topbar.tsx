"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "@/components/theme-provider";
import { Search, Bell, Sun, Moon, Menu, LogOut, Settings, Trash2, SwatchBook, Shield, Clock } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeNotifications } from "@/lib/supabase/realtime";
import { SearchModal } from "./SearchModal";
import LanguageSwitcher from "@/components/LanguageSwitcher";

interface TopbarProps {
  breadcrumb: string;
  onToggleSidebar: () => void;
}

function getInitials(name: string | null, email: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  }
  if (email) return email.substring(0, 2).toUpperCase();
  return "U";
}

export function Topbar({ breadcrumb, onToggleSidebar }: TopbarProps) {
  const { theme, variant, toggleTheme, setVariant } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const isSuperAdmin = pathname.startsWith("/super-admin");
  const isPortal = pathname.startsWith("/employee") || pathname.startsWith("/vendor") || pathname.startsWith("/tenant");
  const [searchOpen, setSearchOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<{ name: string | null; email: string | null }>({
    name: null,
    email: null,
  });

  const [unreadCount, setUnreadCount] = useState(0);
  const [inboxNewCount, setInboxNewCount] = useState(0);
  const [userId, setUserId] = useState("");
  const [auditGrade, setAuditGrade] = useState<string | null>(null);
  const [auditGradeLabel, setAuditGradeLabel] = useState<string | null>(null);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);

  // Real-time: increment badge when new messages arrive
  const { count: realtimeNewCount } = useRealtimeNotifications(userId);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        setUserInfo({
          name: data.user.user_metadata?.full_name ?? null,
          email: data.user.email ?? null,
        });
        // Count unread messages + notifications
        Promise.all([
          supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("recipient_id", data.user.id)
            .eq("is_read", false)
            .eq("is_archived", false),
          supabase
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", data.user.id)
            .eq("is_read", false),
        ]).then(([msgRes, notifRes]) => {
          const total = (msgRes.count ?? 0) + (notifRes.count ?? 0);
          setUnreadCount(total);
        });

        // Fetch trial info from company
        supabase
          .from("company_members")
          .select("company_id")
          .eq("user_id", data.user.id)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle()
          .then(({ data: member }) => {
            if (!member) return;
            supabase
              .from("companies")
              .select("trial_ends_at, subscription_status, stripe_subscription_id")
              .eq("id", member.company_id)
              .single()
              .then(({ data: company }) => {
                if (!company) return;
                // Show trial badge if:
                // 1. Has trial_ends_at and status is trialing, OR
                // 2. No stripe subscription (hasn't paid) regardless of status
                const hasStripe = !!company.stripe_subscription_id;
                if (hasStripe) return; // Paid customer, no trial badge

                if (company.trial_ends_at) {
                  const trialEnd = new Date(company.trial_ends_at).getTime();
                  const daysLeft = Math.max(0, Math.ceil((trialEnd - Date.now()) / (1000 * 60 * 60 * 24)));
                  setTrialDaysLeft(daysLeft);
                } else {
                  // No trial_ends_at set (legacy account) — show 14-day default
                  setTrialDaysLeft(14);
                }
              });
          });
      }
    });
  }, []);

  // Fetch super-admin inbox new count (contact_submissions)
  useEffect(() => {
    if (!isSuperAdmin) return;
    fetch("/api/super-admin/inbox/count")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setInboxNewCount(data.newCount ?? 0);
      })
      .catch(() => {});
  }, [isSuperAdmin, pathname]);

  // Fetch audit grade on mount and on navigation changes
  useEffect(() => {
    fetch("/api/financial/audit-grade")
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data?.grade) {
          setAuditGrade(data.grade);
          setAuditGradeLabel(data.gradeLabel);
        }
      })
      .catch(() => {
        // Silently fail — audit grade is non-critical
      });
  }, [pathname]);

  const gradeColorMap: Record<string, string> = {
    A: "var(--color-green)",
    B: "var(--color-blue)",
    C: "var(--color-amber)",
    D: "var(--color-orange, #f97316)",
    F: "var(--color-red)",
  };
  const gradeColor = auditGrade ? gradeColorMap[auditGrade] || "var(--muted)" : "var(--muted)";

  const totalUnread = unreadCount + realtimeNewCount + inboxNewCount;
  const bellRef = useRef<HTMLButtonElement>(null);

  // Re-trigger bell animation when new real-time notifications arrive
  useEffect(() => {
    if (realtimeNewCount > 0 && bellRef.current) {
      const btn = bellRef.current;
      btn.classList.remove("has-unread");
      void btn.offsetWidth; // force reflow
      btn.classList.add("has-unread");
    }
  }, [realtimeNewCount]);

  // Ctrl+K / Cmd+K shortcut
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      setSearchOpen((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const isTestAccount = userInfo.email === "beltran_alain@yahoo.com";
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function handleResetCompany() {
    if (!resetConfirm) {
      setResetConfirm(true);
      setTimeout(() => setResetConfirm(false), 5000);
      return;
    }
    setResetting(true);
    try {
      const res = await fetch("/api/admin/reset-company", { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        alert(`Deleted: ${data.summary?.map((s: { table: string; deleted: number }) => `${s.table}: ${s.deleted}`).join(", ")}`);
        window.location.reload();
      } else {
        alert(data.error || "Failed to reset");
      }
    } catch {
      alert("Network error");
    } finally {
      setResetting(false);
      setResetConfirm(false);
    }
  }

  const initials = getInitials(userInfo.name, userInfo.email);

  return (
    <>
      <button className="sidebar-toggle" onClick={onToggleSidebar}>
        <Menu size={20} />
      </button>
      <header className="topbar">
        <div className="breadcrumb">
          <span className="dot" />
          <span>{breadcrumb}</span>
        </div>

        {/* Center: Search bar */}
        <button className="search-btn" onClick={() => setSearchOpen(true)}>
          <Search size={14} />
          Search <kbd>Ctrl+K</kbd>
        </button>

        <div className="topbar-right">
          {isTestAccount && (
            <button
              className="reset-company-btn"
              onClick={handleResetCompany}
              disabled={resetting}
              title="Delete all company data (test account only)"
            >
              <Trash2 size={16} />
              {resetting ? "Deleting..." : resetConfirm ? "Click to Confirm" : "Delete All Data"}
            </button>
          )}
          {trialDaysLeft !== null && !isPortal && (
            <button
              className="trial-badge-btn"
              onClick={() => router.push("/admin/settings?tab=subscription")}
              title={`Free trial: ${trialDaysLeft} day${trialDaysLeft !== 1 ? "s" : ""} remaining`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "4px 12px",
                borderRadius: "6px",
                border: `1px solid ${trialDaysLeft <= 3 ? "var(--color-red)" : "var(--color-amber)"}`,
                background: trialDaysLeft <= 3 ? "rgba(220, 38, 38, 0.06)" : "rgba(180, 83, 9, 0.06)",
                color: trialDaysLeft <= 3 ? "var(--color-red)" : "var(--color-amber)",
                fontWeight: 600,
                fontSize: "0.78rem",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              <Clock size={13} />
              {trialDaysLeft === 0
                ? "Trial expired"
                : `${trialDaysLeft}d left in trial`}
            </button>
          )}
          {auditGrade && !isPortal && (
            <button
              className="audit-grade-btn"
              onClick={() => router.push("/financial/audit")}
              title={`Financial Audit: ${auditGradeLabel || auditGrade}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 10px",
                borderRadius: "6px",
                border: "1px solid var(--border)",
                background: "transparent",
                color: gradeColor,
                fontWeight: 700,
                fontSize: "0.78rem",
                cursor: "pointer",
              }}
            >
              <Shield size={14} />
              {auditGrade}
            </button>
          )}
          <button
            onClick={() => setVariant(variant === "classic" ? "corporate" : "classic")}
            className="theme-btn"
            title={`Switch to ${variant === "classic" ? "Corporate" : "Classic"} UI`}
          >
            <SwatchBook size={18} strokeWidth={2} />
          </button>
          <button onClick={toggleTheme} className="theme-btn" title="Toggle theme">
            {theme === "dark" ? (
              <Sun size={18} strokeWidth={2} />
            ) : (
              <Moon size={18} strokeWidth={2} />
            )}
          </button>
          <button
            ref={bellRef}
            className={`notif-btn${totalUnread > 0 ? " has-unread" : ""}`}
            onClick={() => router.push(isSuperAdmin ? "/super-admin/inbox" : "/inbox")}
            title="Inbox"
          >
            <Bell size={20} />
            {totalUnread > 0 && <span className="notif-badge">{totalUnread > 99 ? "99+" : totalUnread}</span>}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="avatar" style={{ cursor: "pointer", border: "none" }}>
                {initials}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8}>
              <DropdownMenuLabel>
                <div style={{ fontWeight: 600 }}>{userInfo.name || "User"}</div>
                {userInfo.email && (
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 400 }}>
                    {userInfo.email}
                  </div>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => router.push(isSuperAdmin ? "/super-admin/settings" : "/admin/settings")}>
                <Settings size={14} style={{ marginRight: 8 }} />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div style={{ padding: "4px 8px" }}>
                <LanguageSwitcher />
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem danger onSelect={handleLogout}>
                <LogOut size={14} style={{ marginRight: 8 }} />
                Log Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
