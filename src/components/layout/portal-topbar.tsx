"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/theme-provider";
import { Sun, Moon, LogOut, Search, Settings, SwatchBook } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { SearchModal } from "./SearchModal";
import LanguageSwitcher from "@/components/LanguageSwitcher";

interface PortalTopbarProps {
  portalType: "tenant" | "vendor" | "employee";
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

const portalLabels: Record<string, string> = {
  tenant: "Tenant Portal",
  vendor: "Vendor Portal",
  employee: "Employee Portal",
};

export function PortalTopbar({ portalType }: PortalTopbarProps) {
  const { theme, variant, toggleTheme, setVariant } = useTheme();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<{ name: string | null; email: string | null }>({
    name: null,
    email: null,
  });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserInfo({
          name: data.user.user_metadata?.full_name ?? null,
          email: data.user.email ?? null,
        });
      }
    });
  }, []);

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

  const initials = getInitials(userInfo.name, userInfo.email);

  return (
    <>
      <nav className="portal-nav">
        <div className="portal-brand">
          <h1>Buildwrk</h1>
          <span className="portal-accent-dot" />
          <span className="portal-label">{portalLabels[portalType] || "Portal"}</span>
        </div>

        <button className="portal-search-btn" onClick={() => setSearchOpen(true)}>
          <Search size={14} />
          Search
          <kbd>Ctrl+K</kbd>
        </button>

        <div className="portal-right">
          <button
            onClick={() => setVariant(variant === "classic" ? "corporate" : "classic")}
            className="portal-theme-btn"
            title={`Switch to ${variant === "classic" ? "Corporate" : "Classic"} UI`}
          >
            <SwatchBook size={18} />
          </button>
          <button onClick={toggleTheme} className="portal-theme-btn" title="Toggle theme">
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="portal-avatar" style={{ cursor: "pointer", border: "none" }}>
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
              <DropdownMenuItem onSelect={() => router.push("/admin/settings")}>
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
      </nav>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
