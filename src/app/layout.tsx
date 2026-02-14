import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ConstructionERP | Construction ERP Software for Contractors and Developers",
  description:
    "All-in-one construction ERP software for general contractors, real estate developers, and property managers. Project management, job costing, property operations, document control, and AI-powered analytics. Start free.",
  keywords: [
    "construction ERP software",
    "construction project management",
    "contractor management platform",
    "job costing software",
    "construction financial management",
    "property management software",
    "real estate development software",
    "construction document management",
    "AI construction software",
    "Gantt chart construction",
    "accounts payable construction",
    "lien waiver tracking",
    "daily log software",
    "RFI management",
    "submittal tracking",
    "construction bid management",
    "workforce time tracking construction",
    "construction CRM",
    "Procore alternative",
    "Buildertrend alternative",
  ],
  openGraph: {
    title: "ConstructionERP | One Platform for Every Project, Every Property, Every Dollar",
    description:
      "Modern construction ERP software that unifies project management, financial tracking, property operations, and AI analytics. Replace Procore + Yardi + QuickBooks with one platform. Free 14-day trial.",
    type: "website",
    locale: "en_US",
    siteName: "ConstructionERP",
  },
  twitter: {
    card: "summary_large_image",
    title: "ConstructionERP | Construction ERP Software",
    description:
      "All-in-one construction ERP for contractors and developers. Project management, job costing, property management, and AI -- one platform. Start free.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://construction-gamma-six.vercel.app",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`} suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
