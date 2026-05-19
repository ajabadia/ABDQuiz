'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/routing';
import { SystemSettings as SharedSystemSettings } from '@abd/styles';

interface SystemSettingsProps {
  isAuthenticated?: boolean;
}

export function SystemSettings({ isAuthenticated = false }: SystemSettingsProps) {
  const t = useTranslations('settings');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleLocaleChange = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
  };

  const handleLogin = () => {
    router.push('/exams');
  };

  return (
    <SharedSystemSettings
      locale={locale}
      onLocaleChange={handleLocaleChange}
      isAuthenticated={isAuthenticated}
      onLogin={handleLogin}
      logoutUrl="/api/auth/logout"
      versionSignature="ABD_QUIZ_V1.0"
      translations={{
        title: t('title'),
        close: t('close'),
        language: t('language'),
        theme: t('theme'),
        themeLight: t('theme_light'),
        themeDark: t('theme_dark'),
        themeSystem: t('theme_system'),
        logout: t('logout'),
        login: t('login'),
      }}
    />
  );
}
