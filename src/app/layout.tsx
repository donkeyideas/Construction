import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "@/components/theme-provider";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
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
  title: "Buildwrk | Buildwrk Software for Contractors and Developers",
  description:
    "All-in-one Buildwrk software for general contractors, real estate developers, and property managers. Project management, job costing, property operations, document control, and AI-powered analytics. Start free.",
  keywords: [
    "Buildwrk software",
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
    title: "Buildwrk | One Platform for Every Project, Every Property, Every Dollar",
    description:
      "Modern Buildwrk software that unifies project management, financial tracking, property operations, and AI analytics. Replace Procore + Yardi + QuickBooks with one platform. Free 14-day trial.",
    type: "website",
    locale: "en_US",
    siteName: "Buildwrk",
  },
  twitter: {
    card: "summary_large_image",
    title: "Buildwrk | Buildwrk Software",
    description:
      "All-in-one Buildwrk for contractors and developers. Project management, job costing, property management, and AI -- one platform. Start free.",
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${playfair.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-0H7BPGBQD8"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-0H7BPGBQD8');`}
        </Script>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <script dangerouslySetInnerHTML={{ __html: `try{var v=localStorage.getItem('buildwrk-variant');document.documentElement.setAttribute('data-variant',v||'classic')}catch(e){document.documentElement.setAttribute('data-variant','classic')}` }} />
      </head>
      <body suppressHydrationWarning>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider>{children}</ThemeProvider>
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
