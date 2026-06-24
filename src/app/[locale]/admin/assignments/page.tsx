/**
 * @purpose Renderiza la página administrativa para gestionar tareas, incluyendo un encabezado, lista de tareas y botón para crear nuevas tareas.
 * @purpose_en Renders the admin page for managing assignments, including a header, list of assignments, and a button to create new assignments.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:10,sig:2pr4rg
 * @lastUpdated 2026-06-23T16:48:28.209Z
 */

import { getTranslations } from 'next-intl/server';
import { ensureIndustrialAccess } from '@ajabadia/satellite-sdk';
import { resolveTenantContext } from '@/lib/tenant-context';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft, CalendarRange } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { AdminPageHeader } from '@ajabadia/styles';
import { GlobalFooter } from '@ajabadia/ecosystem-widgets';
import { listAssignmentsAction } from '@/actions/examAssignment';
import AssignmentsList from './AssignmentsList';

export default async function AdminAssignmentsPage({
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
  const user = await ensureIndustrialAccess('ADMIN');
  const resolvedTenantId = await resolveTenantContext(searchParams);
  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  const tenantSuffix = isSuperAdmin ? `?tenantId=${resolvedTenantId}` : '';

  const assignments = await listAssignmentsAction(undefined, resolvedTenantId);

  // Leer searchParams para saber si abrir el modal de creación
  const searchParamsResolved = await searchParams;
  const showCreateForm = searchParamsResolved?.create === '1';

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-12 selection:bg-primary/30" role="main">
      <div className="max-w-7xl mx-auto flex flex-col gap-10">

        {/* Header Navigation */}
        <AdminPageHeader
          icon={CalendarRange}
          breadcrumb={<>{ap('gobernanza')} • {t('assignmentsTitle')}</>}
          title={t('assignmentsTitle')}
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
          description={<>{t('assignmentsSubtitle')} | Tenant: <span className="text-primary font-bold">{resolvedTenantId}</span></>}
        >
          <Button className="rounded-none font-mono text-[10px] tracking-widest uppercase h-12 px-6" asChild>
            <Link href={`/${locale}/admin/assignments?create=1${tenantSuffix ? `&${tenantSuffix.slice(1)}` : ''}`}>
              <Plus className="w-4 h-4 mr-2" />
              {t('newAssignment')}
            </Link>
          </Button>
        </AdminPageHeader>

        <AssignmentsList assignments={assignments} locale={locale} showCreateForm={showCreateForm} />

        <GlobalFooter label={`${t('brandPart1')}${t('brandPart2')} ${h('version')}`} opacity={20} />
      </div>
    </main>
  );
}
