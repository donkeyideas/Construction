"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Clock, ClipboardList, Camera, User } from "lucide-react";
import { useTranslations } from "next-intl";
import OfflineIndicator from "@/components/OfflineIndicator";
import "@/styles/mobile.css";

const tabs = [
  { href: "/mobile", icon: Home, labelKey: "home" },
  { href: "/mobile/clock", icon: Clock, labelKey: "clock" },
  { href: "/mobile/daily-log", icon: ClipboardList, labelKey: "log" },
  { href: "/mobile/photos", icon: Camera, labelKey: "photos" },
  { href: "/mobile/profile", icon: User, labelKey: "profile" },
];

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const t = useTranslations("mobile.tabs");

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
              <span>{(t as any)(tab.labelKey)}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
