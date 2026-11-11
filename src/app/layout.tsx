import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { THEME_SCRIPT } from "@/components/layout/theme-script";
import { AnalyticsLoader } from "@/features/privacy/components/analytics-loader";
import { CookieConsent } from "@/features/privacy/components/cookie-consent";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Spendsense - Personal Finance Advisor",
  description: "Track your expenses and manage your finances with ease.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
      // The theme script below adds "dark" before React hydrates
      suppressHydrationWarning
    >
      <head>
        {/* Applies the saved or system colour theme before the first paint */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        {/* Before the page content so the banner is early in the tab order */}
        <CookieConsent />
        {children}
        <AnalyticsLoader />
      </body>
    </html>
  );
}
