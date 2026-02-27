"use client";

import { useEffect, useState, useCallback, FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/theme-provider";
import { Sun, Moon, LogOut, Search, Settings, SwatchBook, User, Phone, X } from "lucide-react";
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
  const t = useTranslations("common");
  const [searchOpen, setSearchOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<{ name: string | null; email: string | null }>({
    name: null,
    email: null,
  });

  // Settings modal state (tenant portal only)
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsName, setSettingsName] = useState("");
  const [settingsPhone, setSettingsPhone] = useState("");
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  const [settingsSuccess, setSettingsSuccess] = useState("");

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
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Even if signOut fails, redirect to login
    }
    window.location.href = "/login";
  }

  function openSettings() {
    setSettingsName(userInfo.name ?? "");
    setSettingsPhone("");
    setSettingsError("");
    setSettingsSuccess("");
    setSettingsOpen(true);

    // Fetch current profile data for phone
    fetch("/api/tenant/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.phone) setSettingsPhone(data.phone);
        if (data.full_name) setSettingsName(data.full_name);
      })
      .catch(() => {});
  }

  async function handleSettingsSave(e: FormEvent) {
    e.preventDefault();
    setSettingsSaving(true);
    setSettingsError("");
    setSettingsSuccess("");

    try {
      const res = await fetch("/api/tenant/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: settingsName, phone: settingsPhone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");

      setUserInfo((prev) => ({ ...prev, name: settingsName }));
      setSettingsSuccess("Settings saved successfully.");
      setTimeout(() => {
        setSettingsOpen(false);
        router.refresh();
      }, 800);
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSettingsSaving(false);
    }
  }

  function handleSettingsClick() {
    if (portalType === "tenant") {
      openSettings();
    } else {
      router.push("/admin/settings");
    }
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
          {t("search")}
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
              <DropdownMenuItem onSelect={handleSettingsClick}>
                <Settings size={14} style={{ marginRight: 8 }} />
                {t("settings")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div style={{ padding: "4px 8px" }}>
                <LanguageSwitcher />
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem danger onSelect={handleLogout}>
                <LogOut size={14} style={{ marginRight: 8 }} />
                {t("logOut")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Tenant Settings Modal */}
      {settingsOpen && (
        <div className="tenant-modal-overlay" onClick={() => setSettingsOpen(false)}>
          <div className="tenant-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tenant-modal-header">
              <h3 style={{ margin: 0, fontSize: "1.05rem" }}>{t("settings")}</h3>
              <button
                className="tenant-modal-close"
                onClick={() => setSettingsOpen(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: "0.85rem", color: "var(--muted)", margin: "0 0 16px 0" }}>
              {t("portalSettings.updatePersonalInfo")}
            </p>

            {settingsError && (
              <div className="tenant-alert tenant-alert-error">{settingsError}</div>
            )}
            {settingsSuccess && (
              <div className="tenant-alert tenant-alert-success">{settingsSuccess}</div>
            )}

            <form onSubmit={handleSettingsSave}>
              <div className="tenant-field">
                <label className="tenant-label">
                  <User size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
                  {t("portalSettings.fullName")}
                </label>
                <input
                  type="text"
                  className="tenant-form-input"
                  value={settingsName}
                  onChange={(e) => setSettingsName(e.target.value)}
                  placeholder="Enter your full name"
                  disabled={settingsSaving}
                />
              </div>

              <div className="tenant-field">
                <label className="tenant-label">
                  <Phone size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
                  {t("portalSettings.phone")}
                </label>
                <input
                  type="tel"
                  className="tenant-form-input"
                  value={settingsPhone}
                  onChange={(e) => setSettingsPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  disabled={settingsSaving}
                />
              </div>

              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
                <button
                  type="button"
                  className="ui-btn ui-btn-md ui-btn-outline"
                  onClick={() => setSettingsOpen(false)}
                  disabled={settingsSaving}
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="ui-btn ui-btn-md ui-btn-primary"
                  disabled={settingsSaving}
                >
                  {settingsSaving ? t("loading") : t("portalSettings.saveChanges")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
