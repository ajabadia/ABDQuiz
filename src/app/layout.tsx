import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getLocale } from "next-intl/server";
import { ThemeScript } from "@/components/common/ThemeScript";
import { TenantBrandingStyle } from "@/components/common/TenantBrandingStyle";
import { resolveTenantBranding } from "@/lib/tenant-branding";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ABDQuiz | Industrial Exam Training",
  description: "High-performance platform for exam training and management.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const branding = await resolveTenantBranding();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <ThemeScript />
        <TenantBrandingStyle theme={branding?.theme} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

