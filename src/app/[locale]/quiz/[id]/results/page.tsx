import connectDB from '@/lib/database/mongodb';
import ExamAttempt from '@/models/ExamAttempt';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Trophy, BarChart3, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';
import { type QuizAttemptQuestion } from '@/types/quiz';
import { getTranslations } from 'next-intl/server';

interface ResultsPageProps {
  params: Promise<{ id: string; locale: string }>;
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  const { id, locale } = await params;
  const t = await getTranslations('results');
  
  await connectDB();
  const attempt = await ExamAttempt.findById(id).lean();

  if (!attempt || attempt.status !== 'completed') {
    return notFound();
  }

  const isPassed = attempt.percentage >= 70;
  const questions = (attempt.questions as unknown) as QuizAttemptQuestion[];

  return (
    <main className="min-h-screen bg-background p-6 md:p-24 flex flex-col items-center" role="main">
      <div className="w-full max-w-4xl flex flex-col gap-12">
        
        <header className="flex flex-col items-center text-center gap-6" role="banner">
          <div className="relative">
            {isPassed ? (
              <Trophy className="w-24 h-24 text-primary animate-bounce" aria-hidden="true" />
            ) : (
              <BarChart3 className="w-24 h-24 text-muted-foreground" aria-hidden="true" />
            )}
          </div>
          
          <div className="space-y-2">
            <h1 className="text-5xl font-black tracking-tighter italic uppercase">
              {isPassed ? t('passed') : t('failed')}
            </h1>
            <p className="text-muted-foreground font-mono uppercase tracking-widest text-xs">
              {t('attemptId')}: {attempt._id.toString().slice(-8)} | {t('mode')}: {attempt.mode}
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6" role="region" aria-label="Performance Metrics">
          <Card className="p-8 bg-card/40 border-border/50 flex flex-col items-center gap-2 rounded-none">
            <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-tighter">{t('finalScore')}</span>
            <span className="text-5xl font-black text-primary tabular-nums">{attempt.score}</span>
            <span className="text-xs text-muted-foreground italic">{t('ofPoints', { total: questions.length })}</span>
          </Card>

          <Card className="p-8 bg-card/40 border-border/50 flex flex-col items-center gap-2 rounded-none">
            <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-tighter">{t('performance')}</span>
            <span className="text-5xl font-black text-foreground tabular-nums">{Math.round(attempt.percentage)}%</span>
            <Badge variant="outline" className="mt-2 rounded-none border-primary/20 text-[10px]">
              {isPassed ? 'PASS' : 'FAIL'}
            </Badge>
          </Card>

          <Card className="p-8 bg-card/40 border-border/50 flex flex-col items-center gap-2 rounded-none">
            <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-tighter">{t('timeSpent')}</span>
            <span className="text-5xl font-black text-muted-foreground tabular-nums">{t('placeholderTime')}</span>
            <span className="text-xs text-muted-foreground italic">{t('minutes')}</span>
          </Card>
        </div>

        <section className="space-y-4" aria-labelledby="audit-detail-title">
          <h3 id="audit-detail-title" className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-6">{t('auditDetail')}</h3>
          <div className="space-y-2">
            {questions.map((q: QuizAttemptQuestion, idx: number) => (
              <Card key={idx} className="p-4 bg-card/20 border-border/30 hover:border-border/60 transition-colors rounded-none flex items-center justify-between group" role="listitem">
                <div className="flex items-center gap-4">
                  <div className="font-mono text-[10px] text-muted-foreground w-6" aria-hidden="true">
                    {String(idx + 1).padStart(2, '0')}
                  </div>
                  <span className="text-sm font-medium line-clamp-1 max-w-[500px]">
                    {q.questionSnapshot.questionText}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {q.status === 'correcta' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" aria-label="Correct" />
                  ) : (
                    <XCircle className="w-4 h-4 text-destructive" aria-label="Incorrect" />
                  )}
                  <Badge variant="ghost" className="hidden group-hover:block font-mono text-[9px] uppercase">
                    {t('viewExplanation')}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <footer className="flex justify-center gap-4 pt-12" role="contentinfo">
          <Button variant="outline" className="rounded-none font-mono text-[10px] tracking-widest uppercase px-8 h-12" asChild>
            <Link href={`/${locale}`}>
              <Home className="w-3 h-3 mr-2" aria-hidden="true" />
              {t('backHome')}
            </Link>
          </Button>
          <Button className="rounded-none font-mono text-[10px] tracking-widest uppercase px-12 h-12" asChild>
            <Link href={`/${locale}`}>
              <RotateCcw className="w-3 h-3 mr-2" aria-hidden="true" />
              {t('retry')}
            </Link>
          </Button>
        </footer>

      </div>
    </main>
  );
}
