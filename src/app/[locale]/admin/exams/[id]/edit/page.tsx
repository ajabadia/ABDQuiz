import { getTranslations } from 'next-intl/server';
import { ensureIndustrialAccess } from '@/lib/session';
import ExamConfigForm from '@/components/admin/ExamConfigForm';
import ExamConfig from '@/models/ExamConfig';
import { notFound } from 'next/navigation';
import connectDB from '@/lib/database/mongodb';
import { ArrowLeft, FolderOpen } from 'lucide-react';
import { Link } from '@/i18n/routing';

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
        {/* Header Navigation */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border pb-8">
          <div className="flex flex-col gap-2">
            <div className="text-[10px] font-mono font-black uppercase tracking-[0.25em] text-primary flex items-center gap-2 mb-2">
              <FolderOpen size={14} className="text-primary animate-pulse" aria-hidden="true" />
              CONSOLA DE CONTROL • {t('edit')} {t('examConfig')}
            </div>
            
            <div className="flex items-center gap-4 mt-1">
              <Link 
                href={`/${locale}/admin/exams`}
                className="inline-flex items-center justify-center p-2 bg-transparent text-muted-foreground hover:text-foreground border border-border hover:border-border/80 transition-all duration-200 cursor-pointer rounded-none active:scale-[0.95] shrink-0 focus:outline-none focus:ring-1 focus:ring-primary/50"
                aria-label="Volver a exámenes"
                title="Volver a exámenes"
              >
                <ArrowLeft size={14} aria-hidden="true" />
              </Link>
              
              <h1 className="text-3xl font-black uppercase italic tracking-tight text-foreground leading-none flex-1 truncate">
                {t('edit')} {t('examConfig')}
              </h1>
            </div>
            
            <p className="text-sm text-muted-foreground font-sans mt-2 leading-relaxed">
              {config.name} | ID: <span className="text-primary font-bold">{id.slice(-8)}</span>
            </p>
          </div>
        </header>

        <ExamConfigForm initialData={serializedConfig} locale={locale} />
      </div>
    </main>
  );
}
