import { getTranslations } from 'next-intl/server';
import { Separator } from '@/components/ui/separator';
import { ensureIndustrialAccess } from '@/lib/session';
import ExamsList from '@/components/admin/ExamsList';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft, FolderOpen } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { getExamConfigsAction } from '@/actions/examConfig';

export default async function AdminExamsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('admin');
  const h = await getTranslations('home');
  const ap = await getTranslations('adminPortal');
  const user = await ensureIndustrialAccess('ADMIN');
  
  const configs = await getExamConfigsAction();

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-12 selection:bg-primary/30" role="main">
      <div className="max-w-7xl mx-auto flex flex-col gap-10">
        
        {/* Header: Variante B */}
        <header className="flex flex-col gap-2 relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-4 gap-4">
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
                  {ap('gobernanza')} • {t('examsTitle')}
                </div>
                <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight italic text-foreground leading-none">
                  {t('examsTitle')}
                </h1>
              </div>
            </div>
            
            <Button className="rounded-none font-mono text-[10px] tracking-widest uppercase h-12 px-6" asChild>
              <Link href={`/${locale}/admin/exams/new`}>
                <Plus className="w-4 h-4 mr-2" />
                {t('newExam')}
              </Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t('examsSubtitle')}
          </p>
        </header>

        <ExamsList configs={configs} locale={locale} />
        
        <footer className="mt-auto pt-12 flex flex-col items-center gap-6 text-muted-foreground/20 font-mono text-[9px] uppercase tracking-[0.3em]" role="contentinfo">
          <Separator className="bg-border" aria-hidden="true" />
          <span>{t('brandPart1')}{t('brandPart2')} {h('version')}</span>
        </footer>
      </div>
    </main>
  );
}
