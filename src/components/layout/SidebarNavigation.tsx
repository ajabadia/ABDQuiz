'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/routing';
import { TacticalSidebar as SharedTacticalSidebar } from '@abd/styles';
import { Home, BookOpen, BarChart2, Terminal, AlertTriangle } from 'lucide-react';

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
}

export function SidebarNavigation({ session, logoUrl }: SidebarNavigationProps) {
  const t = useTranslations('common');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const isLoggedIn = session.authenticated && !!session.user;
  const user = session.user;
  const isAdmin = isLoggedIn && user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN');

  // Dynamic tactical links mapped to shared sidebar
  const links = [
    { href: '/', label: t('welcomeMenu'), icon: <Home className="w-4 h-4" /> },
    { href: '/exams', label: t('homeMenu'), icon: <BookOpen className="w-4 h-4" /> },
    ...(isLoggedIn ? [
      { href: '/history', label: t('historyMenu'), icon: <BarChart2 className="w-4 h-4" /> }
    ] : []),
    ...(isLoggedIn && isAdmin ? [
      { href: '/admin', label: t('adminMenu'), icon: <Terminal className="w-4 h-4" /> },
      { href: '/admin/allegations', label: t('claimsMenu'), icon: <AlertTriangle className="w-4 h-4" /> }
    ] : [])
  ];

  // Map user session parameters to the shared NavUser signature
  const navUser = {
    name: isLoggedIn && user ? `${user.name} ${user.surname}` : t('disconnectedSession'),
    role: isLoggedIn && user ? user.role : 'PÚBLICO',
    tenantId: isLoggedIn && user ? user.tenantId : '',
    email: isLoggedIn && user ? user.email : 'Desconectado',
  };

  const handleLogout = () => {
    if (isLoggedIn) {
      window.location.href = '/api/auth/logout';
    } else {
      router.push('/exams');
    }
  };

  const LocalizedLink = ({ href, onClick, className, children }: { href: string; onClick?: () => void; className?: string; children: React.ReactNode }) => (
    <Link href={href} onClick={onClick} className={className}>
      {children}
    </Link>
  );

  return (
    <SharedTacticalSidebar
      user={navUser}
      links={links}
      logoUrl={logoUrl || null}
      onLogout={handleLogout}
      brandName={isLoggedIn && user?.tenantId ? user.tenantId : t('appTitle')}
      LinkComponent={LocalizedLink}
      activeHref={pathname}
      translations={{
        brandFallback: t('appTitle'),
        logoutBtn: isLoggedIn ? t('logout') : t('login'),
        identityProvider: 'IDENTITY PROVIDER',
        statusOnline: isLoggedIn ? 'ONLINE' : 'OFFLINE',
        emailLabel: 'EMAIL',
      }}
    />
  );
}
