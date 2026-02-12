"use client";

import { useTheme } from "@/components/theme-provider";
import { Search, Bell, Sun, Moon, Menu } from "lucide-react";

interface TopbarProps {
  breadcrumb: string;
  onToggleSidebar: () => void;
}

export function Topbar({ breadcrumb, onToggleSidebar }: TopbarProps) {
  const { theme, toggleTheme } = useTheme();

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
          <div className="avatar">JD</div>
        </div>
      </header>
    </>
  );
}
