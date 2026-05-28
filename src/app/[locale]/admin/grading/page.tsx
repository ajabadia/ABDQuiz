import { getTranslations } from 'next-intl/server';
import { AdminPageHeader } from '@ajabadia/styles';
import { GlobalFooter } from '@ajabadia/ecosystem-widgets';
import { ensureIndustrialAccess } from '@ajabadia/satellite-sdk';
import { resolveTenantContext } from '@/lib/tenant-context';
import GradingManager from '@/components/admin/GradingManager';
import { ArrowLeft, GraduationCap } from 'lucide-react';
import { Link } from '@/i18n/routing';

export default async function AdminGradingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // 🚩 Feature Flag check for Open Text Questions & Grading
  const enableOpenText = process.env.NEXT_PUBLIC_ENABLE_OPEN_TEXT_QUESTIONS === 'true';
  if (!enableOpenText) {
    const { notFound } = await import('next/navigation');
    notFound();
  }

  const { locale } = await params;
  const ap = await getTranslations('adminPortal');
  const g = await getTranslations('grading');
  const h = await getTranslations('home');
  const t = await getTranslations('admin');

  const user = await ensureIndustrialAccess('ADMIN');
  const resolvedTenantId = await resolveTenantContext(searchParams);
  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  const tenantSuffix = isSuperAdmin ? `?tenantId=${resolvedTenantId}` : '';

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-12 selection:bg-primary/30" role="main">
      <div className="max-w-7xl mx-auto flex flex-col gap-10">
        <AdminPageHeader
          icon={GraduationCap}
          breadcrumb={<>{ap('gobernanza')} • {g('title')}</>}
          title={g('title')}
          backButton={
            <Link
              href={`/${locale}/admin${tenantSuffix}`}
              className="inline-flex items-center justify-center p-2 bg-transparent text-muted-foreground hover:text-foreground border border-border hover:border-border/80 transition-all duration-200 cursor-pointer rounded-none active:scale-[0.95] shrink-0 focus:outline-none focus:ring-1 focus:ring-primary/50"
              aria-label={ap('btnBack')}
              title="Back to Dashboard"
            >
              <ArrowLeft size={14} aria-hidden="true" />
            </Link>
          }
          description={<>{g('subtitle')} <span className="text-primary font-bold">{resolvedTenantId}</span></>}
        />

        <GradingManager />

        <GlobalFooter label={`${t('brandPart1')}${t('brandPart2')} ${h('version')}`} opacity={20} />
      </div>
    </main>
  );
}
