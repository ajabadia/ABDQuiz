import { getTranslations } from 'next-intl/server';
import { Separator } from '@/components/ui/separator';
import { ensureIndustrialAccess } from '@/lib/session';
import ExamsList from '@/components/admin/ExamsList';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { getExamConfigsAction } from '@/actions/examConfig';

export default async function AdminExamsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('admin');
  const h = await getTranslations('home');
  const user = await ensureIndustrialAccess('ADMIN');
  
  const configs = await getExamConfigsAction();

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-12 selection:bg-primary/30" role="main">
      <div className="max-w-7xl mx-auto flex flex-col gap-10">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-4">
              <div className="h-10 w-1 bg-primary" aria-hidden="true" />
              <h1 className="text-4xl font-black tracking-tighter uppercase italic">
                {t('examsTitle').split(' ')[0]} <span className="text-primary/80">{t('examsTitle').split(' ').slice(1).join(' ')}</span>
              </h1>
            </div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-mono ml-5">
              {t('examsSubtitle')}
            </p>
          </div>
          
          <Button className="rounded-none font-mono text-[10px] tracking-widest uppercase h-12 px-6" asChild>
            <Link href={`/${locale}/admin/exams/new`}>
              <Plus className="w-4 h-4 mr-2" />
              {t('newExam')}
            </Link>
          </Button>
        </header>

        <ExamsList configs={configs} locale={locale} />
        
        <footer className="mt-auto pt-12 flex flex-col items-center gap-6 text-muted-foreground/20 font-mono text-[9px] uppercase tracking-[0.3em]" role="contentinfo">
          <Separator className="w-24 bg-white/5" aria-hidden="true" />
          <span>{t('brandPart1')}{t('brandPart2')} {h('version')}</span>
        </footer>
      </div>
    </main>
  );
}
