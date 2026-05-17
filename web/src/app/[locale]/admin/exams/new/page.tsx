import { getTranslations } from 'next-intl/server';
import { ensureIndustrialAccess } from '@/lib/session';
import ExamConfigForm from '@/components/admin/ExamConfigForm';

export default async function NewExamPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('admin');
  const user = await ensureIndustrialAccess('ADMIN');

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-12 selection:bg-primary/30" role="main">
      <div className="max-w-7xl mx-auto flex flex-col gap-10">
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-4">
            <div className="h-10 w-1 bg-primary" aria-hidden="true" />
            <h1 className="text-4xl font-black tracking-tighter uppercase italic">
              {t('newExam').split(' ')[0]} <span className="text-primary/80">{t('newExam').split(' ').slice(1).join(' ')}</span>
            </h1>
          </div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-mono ml-5">
            {t('creationWizard')} | Tenant: <span className="text-primary">{user.tenantId}</span>
          </p>
        </header>

        <ExamConfigForm locale={locale} />
      </div>
    </main>
  );
}
