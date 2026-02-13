import type { NavItem } from "./navigation";

export const vendorNavigation: NavItem[] = [
  {
    label: "Dashboard",
    href: "/vendor",
    icon: "layout-dashboard",
  },
  {
    label: "My Contracts",
    href: "/vendor/contracts",
    icon: "file-text",
  },
  {
    label: "Invoices",
    icon: "receipt",
    children: [
      { label: "My Invoices", href: "/vendor/invoices" },
      { label: "Submit Invoice", href: "/vendor/invoices/new" },
    ],
  },
  {
    label: "Payments",
    href: "/vendor/payments",
    icon: "dollar-sign",
  },
  {
    label: "My Projects",
    href: "/vendor/projects",
    icon: "hard-hat",
  },
  {
    label: "Documents",
    href: "/vendor/documents",
    icon: "folder-open",
  },
  {
    label: "Compliance",
    href: "/vendor/compliance",
    icon: "shield-check",
  },
  {
    label: "My Profile",
    href: "/vendor/profile",
    icon: "user",
  },
];
