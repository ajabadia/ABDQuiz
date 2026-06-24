/**
 * @purpose Gestiona la página administrativa para el manejo de preguntas, incluyendo una cabecera con navegación y botones, y un componente para gestionar preguntas.
 * @purpose_en Renders the admin page for managing questions, including a header with navigation and buttons, and a component to manage questions.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:9,sig:5glk3v
 * @lastUpdated 2026-06-23T23:21:09.667Z
 */

import { getTranslations } from 'next-intl/server';
import QuestionsManager from '@/components/admin/QuestionsManager';
import { ensureIndustrialAccess } from '@ajabadia/satellite-sdk';
import { resolveTenantContext } from '@/lib/tenant-context';
import { ArrowLeft, FolderOpen, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminPageHeader } from '@ajabadia/styles';
import { GlobalFooter } from '@ajabadia/ecosystem-widgets';
import { Link } from '@/i18n/routing';

/**
 * 🛰️ Admin Questions Repository Page (Federated Server Component)
 */
export default async function AdminQuestionsPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('questions');
  const h = await getTranslations('home');
  const admin = await getTranslations('admin');
  const ap = await getTranslations('adminPortal');

  // 🛡️ Ecosystem Identity Guard
  // Only users authenticated via ABDAuth with ADMIN privileges can enter.
  const user = await ensureIndustrialAccess('ADMIN');
  const resolvedTenantId = await resolveTenantContext(searchParams);
  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  const backUrl = isSuperAdmin ? `/admin?tenantId=${resolvedTenantId}` : '/admin';
  const tenantSuffix = resolvedTenantId ? `?tenantId=${resolvedTenantId}` : '';

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-12 selection:bg-primary/30" role="main">
      <div className="max-w-7xl mx-auto flex flex-col gap-10">
        
        <AdminPageHeader
          icon={FolderOpen}
          breadcrumb={<>{ap('gobernanza')} • {t('title')}</>}
          title={t('title')}
          backButton={
              <Link 
                href={backUrl}
                className="inline-flex items-center justify-center p-2 bg-transparent text-muted-foreground hover:text-foreground border border-border hover:border-border/80 transition-all duration-200 cursor-pointer rounded-none active:scale-[0.95] shrink-0 focus:outline-none focus:ring-1 focus:ring-primary/50"
                aria-label={ap('btnBack')}
                title="Back to Dashboard"
              >
                <ArrowLeft size={14} aria-hidden="true" />
              </Link>
          }
          description={<>{t('subtitle')} | Tenant: <span className="text-primary font-bold">{resolvedTenantId}</span></>}
        >
          <Button className="rounded-none font-mono text-[10px] tracking-widest uppercase h-12 px-6" asChild>
            <Link href={`/${locale}/admin/questions/new${tenantSuffix}`}>
              <Plus className="w-4 h-4 mr-2" />
              {t('newQuestion')}
            </Link>
          </Button>
        </AdminPageHeader>

        <QuestionsManager tenantId={resolvedTenantId} />
        
        <GlobalFooter label={`${admin('brandPart1')}${admin('brandPart2')} ${h('version')}`} opacity={20} />
      </div>
    </main>
  );
}
