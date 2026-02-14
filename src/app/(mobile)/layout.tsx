"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Clock, ClipboardList, Camera, User } from "lucide-react";
import OfflineIndicator from "@/components/OfflineIndicator";
import "@/styles/mobile.css";

const tabs = [
  { href: "/mobile", icon: Home, label: "Home" },
  { href: "/mobile/clock", icon: Clock, label: "Clock" },
  { href: "/mobile/daily-log", icon: ClipboardList, label: "Log" },
  { href: "/mobile/photos", icon: Camera, label: "Photos" },
  { href: "/mobile/profile", icon: User, label: "Profile" },
];

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="mobile-shell">
      <OfflineIndicator />
      <main className="mobile-content">{children}</main>
      <nav className="mobile-tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`mobile-tab ${isActive ? "active" : ""}`}
            >
              <Icon size={20} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
