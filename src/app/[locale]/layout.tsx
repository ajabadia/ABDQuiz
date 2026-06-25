/**
 * @purpose Renderiza el layout para una página específica del local en ABDQuiz, incluyendo navegación, marca y componentes de interfaz.
 * @purpose_en Renders the layout for a locale-specific page in ABDQuiz, including navigation, branding, and UI components.
 * @refactorable false
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:11,sig:177ugp3
 * @lastUpdated 2026-06-23T19:47:59.661Z
 */

import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { Toaster } from "sonner";
import NextTopLoader from "nextjs-toploader";
import { SidebarNavigation } from "@/components/layout/SidebarNavigation";
import { SystemSettings } from "@/components/ui/SystemSettings";
import { QuizCommandPalette } from "@/components/layout/QuizCommandPalette";
import { TenantSelector } from "@/components/ui/TenantSelector";
import { BrandingStyles } from "@ajabadia/satellite-sdk";

import { getIndustrialSession } from '@ajabadia/satellite-sdk/auth-middleware';
import { resolveTenantBranding } from "@ajabadia/satellite-sdk";

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();
  const session = await getIndustrialSession();
  const branding = await resolveTenantBranding();

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <BrandingStyles />
      <NextTopLoader
        color="hsl(var(--primary))"
        height={2}
        showSpinner={false}
        zIndex={45}
        speed={200}
      />
      <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 transition-colors duration-300">
        <SidebarNavigation
          session={session}
          logoUrl={branding?.logoUrl}
          tenantSelectorSlot={session.authenticated ? <TenantSelector sessionUser={session.user} /> : undefined}
          settingsSlot={<SystemSettings isAuthenticated={session.authenticated} />}
        />
        <QuizCommandPalette />

        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
        />
      </div>
    </NextIntlClientProvider>
  );
}

