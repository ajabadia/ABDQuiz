/**
 * @purpose Renderiza la página administrativa para gestionar acusaciones, incluyendo la recuperación y visualización de datos de acusaciones.
 * @purpose_en Renders the administrative page for managing allegations, including fetching and displaying allegation data.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:9,sig:1prcnt3
 * @lastUpdated 2026-06-23T16:48:06.966Z
 */

import { connectDB } from '@ajabadia/satellite-sdk';
import { ensureIndustrialAccess } from '@ajabadia/satellite-sdk';
import { resolveTenantContext } from '@/lib/tenant-context';
import { AllegationService } from '@/services/allegations/allegationService';
import { AllegationsClientTerminal } from '@/components/admin/AllegationsClientTerminal';
import { getTranslations } from 'next-intl/server';
import { ArrowLeft, FolderOpen } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { AdminPageHeader } from '@ajabadia/styles';

interface AllegationsAdminPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AllegationsAdminPage({ params, searchParams }: AllegationsAdminPageProps) {
  const { locale } = await params;
  const user = await ensureIndustrialAccess('ADMIN');
  const resolvedTenantId = await resolveTenantContext(searchParams);
  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  const tenantSuffix = isSuperAdmin ? `?tenantId=${resolvedTenantId}` : '';
  const t = await getTranslations('allegations');
  const ap = await getTranslations('adminPortal');

  await connectDB();
  const allegations = await AllegationService.getTenantAllegations(resolvedTenantId);

  // Serialize Mongoose docs to POJOs to prevent Server-to-Client hydration mismatch
  const serializedAllegations = JSON.parse(JSON.stringify(allegations));

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

        <AllegationsClientTerminal
          initialAllegations={serializedAllegations}
          translations={{
            kpiPending: t('kpiPending'),
            kpiApproved: t('kpiApproved'),
            kpiRejected: t('kpiRejected'),
            tableQuestion: t('tableQuestion'),
            tableReason: t('tableReason'),
            statusPending: t('statusPending'),
            statusApproved: t('statusApproved'),
            statusRejected: t('statusRejected'),
            btnResolve: t('btnResolve'),
            modalTitle: t('modalTitle'),
            modalDesc: t('modalDesc'),
            optionShift: t('optionShift'),
            optionShiftDesc: t('optionShiftDesc'),
            optionCancel: t('optionCancel'),
            optionCancelDesc: t('optionCancelDesc'),
            optionGivePoints: t('optionGivePoints'),
            optionGivePointsDesc: t('optionGivePointsDesc'),
            labelFeedback: t('labelFeedback'),
            btnSubmitResolution: t('btnSubmitResolution'),
            noAllegations: t('noAllegations'),
            btnReject: t('btnReject'),
            feedbackPlaceholder: t('feedbackPlaceholder'),
            toastResolveError: t('toastResolveError'),
            feedbackTecnico: t('feedbackTecnico'),
            resolutionStrategy: t('resolutionStrategy'),
            newCorrectIndex: t('newCorrectIndex')
          }}
        />
      </div>
    </main>
  );
}
