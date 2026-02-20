import type { NavItem } from "./navigation";

export const employeeNavigation: NavItem[] = [
  {
    label: "Dashboard",
    href: "/employee",
    icon: "layout-dashboard",
  },
  {
    label: "Clock In/Out",
    href: "/employee/time",
    icon: "clock",
  },
  {
    label: "My Timesheets",
    href: "/employee/timesheets",
    icon: "calendar",
  },
  {
    label: "Payslips",
    href: "/employee/payslips",
    icon: "file-text",
  },
  {
    label: "My Certifications",
    href: "/employee/certifications",
    icon: "shield-check",
  },
  {
    label: "My Profile",
    href: "/employee/profile",
    icon: "user",
  },
];
