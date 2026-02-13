"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/theme-provider";
import { Search, Bell, Sun, Moon, Menu, LogOut, User, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";

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
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
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

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
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
        <div className="topbar-right">
          <button onClick={toggleTheme} className="theme-btn" title="Toggle theme">
            {theme === "dark" ? (
              <Sun size={18} strokeWidth={2} />
            ) : (
              <Moon size={18} strokeWidth={2} />
            )}
          </button>
          <button className="search-btn">
            <Search size={14} />
            Search <kbd>Ctrl+K</kbd>
          </button>
          <button className="notif-btn">
            <Bell size={20} />
            <span className="notif-badge">3</span>
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
              <DropdownMenuItem onSelect={() => router.push("/settings")}>
                <Settings size={14} style={{ marginRight: 8 }} />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem danger onSelect={handleLogout}>
                <LogOut size={14} style={{ marginRight: 8 }} />
                Log Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </>
  );
}
