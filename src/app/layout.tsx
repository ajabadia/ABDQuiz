import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getLocale } from "next-intl/server";
import { headers } from "next/headers";
import { getIndustrialSession } from "@/lib/session";
import { ThemeScript } from "@/components/common/ThemeScript";
import { TenantBrandingStyle } from "@/components/common/TenantBrandingStyle";
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

interface TenantBrandingTheme {
  primary: string;
  secondary?: string;
  background?: string;
  rounded?: boolean;
  radius?: string;
}

interface TenantBranding {
  logoUrl?: string | null;
  theme?: TenantBrandingTheme | null;
}

interface UserWithBranding {
  id: string;
  email: string;
  name: string;
  surname: string;
  role: string;
  tenantId: string;
  dbPrefix: string;
  isolationStrategy: string;
  branding?: TenantBranding | null;
}

/**
 * 🏢 Helper to extract tenant subdomain from host header
 */
function getTenantSubdomain(host: string | null): string | null {
  if (!host) return null;
  const hostname = host.split(':')[0];
  const parts = hostname.split('.');
  
  if (parts.length > 2) {
    const subdomain = parts[0];
    if (subdomain === 'www') return null;
    return subdomain;
  }
  
  if (parts.length === 2 && parts[1] === 'localhost') {
    return parts[0];
  }
  
  return null;
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const session = await getIndustrialSession();
  
  let branding = session.user ? (session.user as UserWithBranding).branding : null;

  // 🎨 Fallback dynamic pre-vesting: if no session, try fetching branding using the subdomain
  if (!branding) {
    const headersList = await headers();
    const host = headersList.get('host');
    const subdomain = getTenantSubdomain(host);

    if (subdomain) {
      try {
        const providerUrl = process.env.AUTH_PROVIDER_URL || 'https://abd-auth.vercel.app';
        const res = await fetch(`${providerUrl}/api/auth/tenant/info?subdomain=${subdomain}`, {
          next: { revalidate: 3600 } // Cache branding configuration for 1 hour
        } as RequestInit & { next?: { revalidate: number } });
        if (res.ok) {
          const tenantData = await res.json() as { branding: TenantBranding | null };
          branding = tenantData.branding;
        }
      } catch (err) {
        console.error('[SSR_TENANT_BRANDING_ERROR]', err);
      }
    }
  }

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
