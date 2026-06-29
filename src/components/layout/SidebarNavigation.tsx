'use client';

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { AppSidebarNavigation, type AppSidebarLink } from '@ajabadia/ecosystem-widgets';
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
  const [tenantId, setTenantId] = React.useState<string | null>(null);

  React.useEffect(() => {
    React.startTransition(() => {
      const params = new URLSearchParams(window.location.search);
      setTenantId(params.get('tenantId'));
    });
  }, []);

  const isLoggedIn = session.authenticated && !!session.user;
  const user = session.user;

  const allLinks: AppSidebarLink[] = [
    { href: '/', label: t('welcomeMenu'), icon: <Home className="w-4 h-4" /> },
    { href: '/dashboard', label: t('dashboardMenu'), icon: <LayoutDashboard className="w-4 h-4" />, requiresAuth: true },
    { href: '/exams', label: t('homeMenu'), icon: <BookOpen className="w-4 h-4" /> },
    { href: '/history', label: t('historyMenu'), icon: <BarChart2 className="w-4 h-4" />, requiresAuth: true },
    { href: '/admin', label: t('adminMenu'), icon: <Terminal className="w-4 h-4" />, requiresAdmin: true },
    { href: '/admin/allegations', label: t('claimsMenu'), icon: <AlertTriangle className="w-4 h-4" />, requiresAdmin: true },
    { href: '/admin/assignments', label: t('assignmentsMenu'), icon: <CalendarRange className="w-4 h-4" />, requiresAdmin: true },
    { href: '/admin/dashboard', label: locale === 'es' ? 'Facturación' : 'Billing', icon: <TrendingUp className="w-4 h-4" />, requiresAdmin: true },
    { href: '/admin/incidents', label: locale === 'es' ? 'Incidencias' : 'Incidents', icon: <AlertCircle className="w-4 h-4" />, requiresAdmin: true },
  ];

  const transformHref = React.useCallback(
    (href: string) => {
      return tenantId ? `${href}?tenantId=${tenantId}` : href;
    },
    [tenantId]
  );

  return (
    <AppSidebarNavigation
      session={session}
      logoUrl={logoUrl || null}
      links={allLinks}
      brandName={t('appTitle')}
      appBadge="QUIZ"
      transformHref={tenantId ? transformHref : undefined}
      tenantSelectorSlot={tenantSelectorSlot}
      settingsSlot={settingsSlot}
      notificationsSlot={isLoggedIn && user?.role?.toUpperCase() !== 'USER' ? <ChatUnreadBadge /> : undefined}
      translations={{
        logoutBtn: t('logout'),
        statusOnline: isLoggedIn ? 'ONLINE' : 'OFFLINE',
      }}
    />
  );
}
