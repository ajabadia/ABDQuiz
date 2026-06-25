'use client';

/**
 * @purpose Renderiza un componente de navegación lateral con soporte para autenticación del usuario y localización.
 * @purpose_en Renders a sidebar navigation component with user authentication and localization support.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:6,sig:1fbfo7g
 * @lastUpdated 2026-06-23T19:49:25.976Z
 */

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/routing';
import { SmartNavbar, buildSidebarLinks } from '@ajabadia/ecosystem-widgets';
import { Home, LayoutDashboard, BookOpen, BarChart2, Terminal, AlertTriangle, CalendarRange, TrendingUp, AlertCircle } from 'lucide-react';
import { ChatUnreadBadge } from '@/components/chat/ChatUnreadBadge';

interface UserSession {
  authenticated: boolean;
  user?: {
    name: string;
    surname: string;
    email: string;
    role: string;
    tenantId: string;
  };
}

interface SidebarNavigationProps {
  session: UserSession;
  logoUrl?: string | null;
  tenantSelectorSlot?: React.ReactNode;
  settingsSlot?: React.ReactNode;
}

export function SidebarNavigation({ session, logoUrl, tenantSelectorSlot, settingsSlot }: SidebarNavigationProps) {
  const t = useTranslations('common');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [tenantId, setTenantId] = React.useState<string | null>(null);

  // Leer tenantId de la URL solo en el cliente (post-hidratación)
  // para evitar hydration mismatch con window.location.search
  // Usar startTransition para evitar setState síncrono en effect
  React.useEffect(() => {
    React.startTransition(() => {
      const params = new URLSearchParams(window.location.search);
      setTenantId(params.get('tenantId'));
    });
  }, []);

  const isLoggedIn = session.authenticated && !!session.user;
  const user = session.user;

  const allLinks = [
    { href: '/', label: t('welcomeMenu'), icon: <Home className="w-4 h-4" /> },
    { href: '/dashboard', label: t('dashboardMenu'), icon: <LayoutDashboard className="w-4 h-4" />, requiresAuth: true },
    { href: '/exams', label: t('homeMenu'), icon: <BookOpen className="w-4 h-4" /> },
    { href: '/history', label: t('historyMenu'), icon: <BarChart2 className="w-4 h-4" />, requiresAuth: true },
    { href: '/admin', label: t('adminMenu'), icon: <Terminal className="w-4 h-4" />, requiresAdmin: true },
    { href: '/admin/allegations', label: t('claimsMenu'), icon: <AlertTriangle className="w-4 h-4" />, requiresAdmin: true },
    { href: '/admin/assignments', label: t('assignmentsMenu'), icon: <CalendarRange className="w-4 h-4" />, requiresAdmin: true },
    { href: '/admin/dashboard', label: locale === 'es' ? 'Facturación' : 'Billing', icon: <TrendingUp className="w-4 h-4" />, requiresAdmin: true },
    { href: '/admin/incidents', label: locale === 'es' ? 'Incidencias' : 'Incidents', icon: <AlertCircle className="w-4 h-4" />, requiresAdmin: true },
  ] as const;

  const links = buildSidebarLinks(allLinks, user?.role, isLoggedIn);

  const handleLogout = () => {
    window.location.href = '/api/auth/logout';
  };

  // Add tenantId query param to all nav links
  const transformHref = (href: string) => {
    return tenantId ? `${href}?tenantId=${tenantId}` : href;
  };

  const handleLocaleChange = (newLocale: string) => {
    let domainSuffix = "";
    const hostname = window.location.hostname;
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      const parts = hostname.split('.');
      if (parts.length >= 2) {
        domainSuffix = `; domain=.${parts.slice(-2).join('.')}`;
      }
    }
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax${domainSuffix}`;
    const search = typeof window !== 'undefined' ? window.location.search : '';
    router.replace(`${pathname}${search}`, { locale: newLocale });
  };

  return (
    <SmartNavbar
      session={session}
      links={links}
      logoUrl={logoUrl || null}
      brandName={t('appTitle')}
      activeHref={pathname}
      locale={locale}
      onLogout={handleLogout}
      transformHref={tenantId ? transformHref : undefined}
      tenantSelectorSlot={tenantSelectorSlot}
      settingsSlot={settingsSlot}
      notificationsSlot={isLoggedIn && user?.role?.toUpperCase() !== 'USER' ? <ChatUnreadBadge /> : undefined}
      onLocaleChange={handleLocaleChange}
      appBadge="QUIZ"
      onSearchTrigger={() => {
        window.dispatchEvent(new CustomEvent('abd-command-palette-open'));
      }}
      translations={{
        brandFallback: t('appTitle'),
        logoutBtn: t('logout'),
        identityProvider: 'IDENTITY PROVIDER',
        statusOnline: isLoggedIn ? 'ONLINE' : 'OFFLINE',
        emailLabel: 'EMAIL',
      }}
    />
  );
}
