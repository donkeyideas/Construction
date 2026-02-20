"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/theme-provider";
import { Sun, Moon, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";

interface PortalTopbarProps {
  portalType: "tenant" | "vendor";
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

export function PortalTopbar({ portalType }: PortalTopbarProps) {
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

  function switchPortal(target: "tenant" | "vendor") {
    if (target === portalType) return;
    router.push(target === "tenant" ? "/tenant" : "/vendor");
  }

  const initials = getInitials(userInfo.name, userInfo.email);

  return (
    <nav className="portal-nav">
      <div className="portal-brand">
        <h1>Buildwrk</h1>
        <span className="portal-accent-dot" />
        <span className="portal-label">Portal</span>
      </div>

      <div className="portal-tabs">
        <button
          className={`portal-tab${portalType === "tenant" ? " active" : ""}`}
          onClick={() => switchPortal("tenant")}
        >
          Tenant Portal
        </button>
        <button
          className={`portal-tab${portalType === "vendor" ? " active" : ""}`}
          onClick={() => switchPortal("vendor")}
        >
          Vendor Portal
        </button>
      </div>

      <div className="portal-right">
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
            <DropdownMenuItem danger onSelect={handleLogout}>
              <LogOut size={14} style={{ marginRight: 8 }} />
              Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
