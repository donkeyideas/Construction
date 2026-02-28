import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Invoice - Buildwrk",
};

export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return children;
}
