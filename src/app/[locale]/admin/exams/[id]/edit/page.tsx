import { getTranslations } from 'next-intl/server';
import { ensureIndustrialAccess, withTenantContext, resolveTargetTenantContext } from '@ajabadia/satellite-sdk';
import { resolveTenantContext } from '@/lib/tenant-context';
import ExamConfigForm from '@/components/admin/ExamConfigForm';
import ExamConfig from '@/models/ExamConfig';
import { notFound } from 'next/navigation';
import { connectDB } from '@ajabadia/satellite-sdk';
import { ArrowLeft, FolderOpen } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { AdminPageHeader } from '@ajabadia/styles';

export default async function EditExamPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string, id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale, id } = await params;
  const t = await getTranslations('admin');
  const user = await ensureIndustrialAccess('ADMIN');
  const resolvedTenantId = await resolveTenantContext(searchParams);
  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  const tenantSuffix = isSuperAdmin ? `?tenantId=${resolvedTenantId}` : '';

  // ── Multi-tenant awareness ─────────────────────────────────────────────
  // ExamConfig uses getTenantModel (Proxy), which only routes queries to the
  // tenant-specific connection/collection when called inside withTenantContext.
  // Without it, findById() hits the default (non-prefixed) collection and
  // returns null, causing a false 404.
  const explicitCtx = await resolveTargetTenantContext(resolvedTenantId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let config: any = null;
  await withTenantContext(async () => {
    await connectDB();
    config = await ExamConfig.findById(id).lean();
  }, explicitCtx);

  if (!config || (config.tenantId !== user.tenantId && !isSuperAdmin)) {
    return notFound();
  }

  // Serializar para el Client Component
  const serializedConfig = JSON.parse(JSON.stringify(config));

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-12 selection:bg-primary/30" role="main">
      <div className="max-w-7xl mx-auto flex flex-col gap-10">
        {/* Header Navigation */}
        <AdminPageHeader
          icon={FolderOpen}
          breadcrumb={<>CONSOLA DE CONTROL • {t('edit')} {t('examConfig')}</>}
          title={<>{t('edit')} {t('examConfig')}</>}
          backButton={
              <Link 
                href={`/${locale}/admin/exams${tenantSuffix}`}
                className="inline-flex items-center justify-center p-2 bg-transparent text-muted-foreground hover:text-foreground border border-border hover:border-border/80 transition-all duration-200 cursor-pointer rounded-none active:scale-[0.95] shrink-0 focus:outline-none focus:ring-1 focus:ring-primary/50"
                aria-label="Volver a exámenes"
                title="Volver a exámenes"
              >
                <ArrowLeft size={14} aria-hidden="true" />
              </Link>
          }
          description={<>{config.name} | ID: <span className="text-primary font-bold">{id.slice(-8)}</span></>}
        />

        <ExamConfigForm initialData={serializedConfig} locale={locale} tenantId={resolvedTenantId} />
      </div>
    </main>
  );
}
