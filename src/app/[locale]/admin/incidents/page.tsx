/**
 * @purpose Renderiza la página de incidentes administrativos con un encabezado, componente gerenciador de incidente y pie de página.
 * @purpose_en Renders the admin incidents page with a header, incident manager component, and footer.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:9,sig:geadmv
 * @lastUpdated 2026-06-25T09:19:09.583Z
 */

import { getTranslations } from 'next-intl/server';
import { ensureAdminOrProfessor } from '@/lib/auth/ensureQuizAccess';
import { resolveTenantContext } from '@/lib/tenant-context';
import { IncidentsManager } from '@/components/admin/IncidentsManager';
import { AdminPageHeader } from '@ajabadia/styles';
import { GlobalFooter } from '@ajabadia/ecosystem-widgets';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function AdminIncidentsPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('common');
  const ap = await getTranslations('adminPortal');

  const user = await ensureAdminOrProfessor();
  const resolvedTenantId = await resolveTenantContext(searchParams);

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-12 selection:bg-primary/30" role="main">
      <div className="max-w-7xl mx-auto flex flex-col gap-10">

        <Link
          href={`/${locale}/admin`}
          className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {locale === 'es' ? 'Volver a Admin' : 'Back to Admin'}
        </Link>

        <AdminPageHeader
          icon={AlertCircle}
          breadcrumb={<>{t('appTitle')} • {locale === 'es' ? 'INCIDENCIAS' : 'INCIDENTS'}</>}
          title={<>{t('appTitle')} <span className="text-primary">{locale === 'es' ? 'Incidencias en Vivo' : 'Live Incidents'}</span></>}
          description={<>{locale === 'es' ? 'Chat de incidencias durante exámenes' : 'Real-time incident chat during exams'}<span className="text-primary font-bold"> {resolvedTenantId}</span></>}
        />

        <IncidentsManager tenantId={resolvedTenantId} />

        <GlobalFooter label={`${t('appTitle')} INCIDENTS`} opacity={20} />
      </div>
    </main>
  );
}
