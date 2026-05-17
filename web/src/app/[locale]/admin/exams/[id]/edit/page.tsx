import { getTranslations } from 'next-intl/server';
import { ensureIndustrialAccess } from '@/lib/session';
import ExamConfigForm from '@/components/admin/ExamConfigForm';
import ExamConfig from '@/models/ExamConfig';
import { notFound } from 'next/navigation';
import connectDB from '@/lib/database/mongodb';

export default async function EditExamPage({ params }: { params: Promise<{ locale: string, id: string }> }) {
  const { locale, id } = await params;
  const t = await getTranslations('admin');
  const user = await ensureIndustrialAccess('ADMIN');

  await connectDB();
  const config = await ExamConfig.findById(id).lean();

  if (!config || config.tenantId !== user.tenantId) {
    return notFound();
  }

  // Serializar para el Client Component
  const serializedConfig = JSON.parse(JSON.stringify(config));

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-12 selection:bg-primary/30" role="main">
      <div className="max-w-7xl mx-auto flex flex-col gap-10">
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-4">
            <div className="h-10 w-1 bg-primary" aria-hidden="true" />
            <h1 className="text-4xl font-black tracking-tighter uppercase italic">
              {t('edit')} <span className="text-primary/80">{t('examConfig')}</span>
            </h1>
          </div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-mono ml-5">
            {config.name} | ID: <span className="text-primary">{id.slice(-8)}</span>
          </p>
        </header>

        <ExamConfigForm initialData={serializedConfig} locale={locale} />
      </div>
    </main>
  );
}
