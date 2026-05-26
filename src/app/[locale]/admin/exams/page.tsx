import { getTranslations } from 'next-intl/server';
import { ensureIndustrialAccess } from '@/lib/session';
import { resolveTenantContext } from '@/lib/tenant-context';
import ExamsList from '@/components/admin/ExamsList';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft, FolderOpen } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { getExamConfigsAction } from '@/actions/examConfig';
import { AdminPageHeader } from '@abd/styles';
import { GlobalFooter } from '@abd/ecosystem-widgets';

export default async function AdminExamsPage({
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
  
  const configs = await getExamConfigsAction(resolvedTenantId);

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-12 selection:bg-primary/30" role="main">
      <div className="max-w-7xl mx-auto flex flex-col gap-10">
        
        {/* Header Navigation */}
        <AdminPageHeader
          icon={FolderOpen}
          breadcrumb={<>{ap('gobernanza')} • {t('examsTitle')}</>}
          title={t('examsTitle')}
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
          description={<>{t('examsSubtitle')} | Tenant: <span className="text-primary font-bold">{resolvedTenantId}</span></>}
        >
          <Button className="rounded-none font-mono text-[10px] tracking-widest uppercase h-12 px-6" asChild>
            <Link href={`/${locale}/admin/exams/new${tenantSuffix}`}>
              <Plus className="w-4 h-4 mr-2" />
              {t('newExam')}
            </Link>
          </Button>
        </AdminPageHeader>

        <ExamsList configs={configs} locale={locale} />
        
        <GlobalFooter label={`${t('brandPart1')}${t('brandPart2')} ${h('version')}`} opacity={20} />
      </div>
    </main>
  );
}
