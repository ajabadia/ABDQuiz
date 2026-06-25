/**
 * @purpose Renderiza la página corporal del administrador con un encabezado, una consola de control y un pie de página.
 * @purpose_en Renders the admin corpus page with a header, dashboard, and footer.
 * @refactorable false
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:8,sig:18sem0a
 * @lastUpdated 2026-06-23T23:08:13.481Z
 */

import { getTranslations } from 'next-intl/server';
import { AdminPageHeader } from '@ajabadia/styles';
import { GlobalFooter } from '@ajabadia/ecosystem-widgets';
import { resolveTenantContext } from '@/lib/tenant-context';
import CorpusDashboard from '@/components/admin/CorpusDashboard';
import { ensureIndustrialAccess } from '@ajabadia/satellite-sdk/auth-middleware';
import { ArrowLeft, FolderOpen } from 'lucide-react';
import { Link } from '@/i18n/routing';

/**
 * 🛰️ Admin Corpus Page (Federated Server Component)
 */
export default async function AdminCorpusPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('admin');
  const h = await getTranslations('home');
  const ap = await getTranslations('adminPortal');

  // 🛡️ Ecosystem Identity Guard
  // Only users authenticated via ABDAuth with ADMIN privileges can enter.
  const user = await ensureIndustrialAccess('ADMIN');
  const resolvedTenantId = await resolveTenantContext(searchParams);
  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  const tenantSuffix = isSuperAdmin ? `?tenantId=${resolvedTenantId}` : '';

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-12 selection:bg-primary/30" role="main">
      <div className="max-w-7xl mx-auto flex flex-col gap-10">
        
        {/* Header Navigation */}
        <AdminPageHeader
          icon={FolderOpen}
          breadcrumb={<>{ap('gobernanza')} • {t('title')}</>}
          title={t('title')}
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
          description={<>{t('subtitle')} | Tenant: <span className="text-primary font-bold">{resolvedTenantId}</span></>}
        />

        <CorpusDashboard tenantId={resolvedTenantId} />
        
        <GlobalFooter label={`${t('brandPart1')}${t('brandPart2')} ${h('version')}`} opacity={20} />
      </div>
    </main>
  );
}
