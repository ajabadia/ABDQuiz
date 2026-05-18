import connectDB from '@/lib/database/mongodb';
import { ensureIndustrialAccess } from '@/lib/session';
import { AllegationService } from '@/services/allegations/allegationService';
import { AllegationsClientTerminal } from '@/components/admin/AllegationsClientTerminal';
import { getTranslations } from 'next-intl/server';
import { ArrowLeft, FolderOpen } from 'lucide-react';
import { Link } from '@/i18n/routing';

interface AllegationsAdminPageProps {
  params: Promise<{ locale: string }>;
}

export default async function AllegationsAdminPage({ params }: AllegationsAdminPageProps) {
  const { locale } = await params;
  const user = await ensureIndustrialAccess('ADMIN');
  const t = await getTranslations('allegations');
  const ap = await getTranslations('adminPortal');

  await connectDB();
  const allegations = await AllegationService.getTenantAllegations(user.tenantId);

  // Serialize Mongoose docs to POJOs to prevent Server-to-Client hydration mismatch
  const serializedAllegations = JSON.parse(JSON.stringify(allegations));

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-12 selection:bg-primary/30" role="main">
      <div className="max-w-7xl mx-auto flex flex-col gap-10">
        
        {/* Header: Variante B */}
        <header className="flex flex-col gap-2 relative">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-4">
              <Link
                href="/admin"
                className="p-2 border border-border bg-card/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer rounded-none"
                aria-label={ap('btnBack')}
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5 font-mono text-[9px] text-primary/80 uppercase tracking-widest">
                  <FolderOpen className="w-3.5 h-3.5 text-primary animate-pulse" />
                  {ap('gobernanza')} • {t('title')}
                </div>
                <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight italic text-foreground leading-none">
                  {t('title')}
                </h1>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t('subtitle')}
          </p>
        </header>

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
