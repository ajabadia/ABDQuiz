/**
 * @purpose Renderiza el layout para una página específica del local en ABDQuiz, incluyendo navegación, marca y componentes de interfaz.
 * @purpose_en Renders the layout for a locale-specific page in ABDQuiz, including navigation, branding, and UI components.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:7,sig:9ab8cp
 * @lastUpdated 2026-06-29T00:00:00.000Z
 */

import { getMessages } from "next-intl/server";
import { BrandingStyles } from "@ajabadia/satellite-sdk";
import { getIndustrialSession } from '@ajabadia/satellite-sdk/auth-middleware';
import { resolveTenantBranding } from "@ajabadia/satellite-sdk";
import { AppShellLayout } from "@ajabadia/ecosystem-widgets";
import { SidebarNavigation } from "@/components/layout/SidebarNavigation";
import { SystemSettings } from "@/components/ui/SystemSettings";
import { QuizCommandPalette } from "@/components/layout/QuizCommandPalette";
import { TenantSelector } from "@/components/ui/TenantSelector";

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
    <AppShellLayout
      locale={locale}
      messages={messages}
      brandingStyles={<BrandingStyles />}
      sidebarNavigation={
        <SidebarNavigation
          session={session}
          logoUrl={branding?.logoUrl}
          tenantSelectorSlot={session.authenticated ? <TenantSelector sessionUser={session.user} /> : undefined}
          settingsSlot={<SystemSettings isAuthenticated={session.authenticated} />}
        />
      }
      commandPalette={<QuizCommandPalette />}
    >
      {children}
    </AppShellLayout>
  );
}

