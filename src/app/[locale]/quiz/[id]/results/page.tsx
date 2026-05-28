import { connectDB } from '@ajabadia/satellite-sdk';
import ExamAttempt from '@/models/ExamAttempt';
import ExamConfig from '@/models/ExamConfig'; // Importamos para registrar el modelo en Mongoose
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Trophy, BarChart3, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';
import { type QuizAttemptQuestion } from '@/types/quiz';
import { getTranslations } from 'next-intl/server';
import { AuditDetail } from '@/components/quiz/AuditDetail';
import { withTenantContext } from '@ajabadia/satellite-sdk';

interface ResultsPageProps {
  params: Promise<{ id: string; locale: string }>;
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  const { id, locale } = await params;
  const t = await getTranslations('results');
  const ta = await getTranslations('allegations');
  
  return withTenantContext(async () => {
    await connectDB();
    const attempt = await ExamAttempt.findById(id).populate('examConfigId').lean();

    if (!attempt || attempt.status !== 'completed') {
      return notFound();
    }

    // Serialize to plain object
    const serializedAttempt = JSON.parse(JSON.stringify(attempt));
    const config = serializedAttempt.examConfigId;
    const passThreshold = config?.passThreshold ?? 70;
    const isPassed = serializedAttempt.percentage >= passThreshold;
    const questions = serializedAttempt.questions as QuizAttemptQuestion[];

    let maxPossiblePoints = questions.length;
    if (config?.scoringMode === 'weighted' && config.difficultyWeights) {
      maxPossiblePoints = questions.reduce((sum, q) => {
        const diff = q.questionSnapshot.difficulty || 'medium';
        return sum + (config.difficultyWeights[diff] || 1);
      }, 0);
    } else if (config?.pointsPerCorrect) {
      maxPossiblePoints = questions.length * config.pointsPerCorrect;
    }

    return (
      <main className="min-h-screen bg-background text-foreground p-6 md:p-12 selection:bg-primary/30" role="main">
        <div className="max-w-7xl mx-auto flex flex-col gap-10">
          
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
                {t('attemptId')}: {serializedAttempt._id.slice(-8)} | {t('mode')}: {serializedAttempt.mode}
              </p>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6" role="region" aria-label="Performance Metrics">
            <Card className="p-8 bg-card/40 border-border/50 flex flex-col items-center gap-2 rounded-none">
              <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-tighter">{t('finalScore')}</span>
              <span className="text-5xl font-black text-primary tabular-nums">{serializedAttempt.score}</span>
              <span className="text-xs text-muted-foreground italic">{t('ofPoints', { total: maxPossiblePoints })}</span>
            </Card>

            <Card className="p-8 bg-card/40 border-border/50 flex flex-col items-center gap-2 rounded-none">
              <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-tighter">{t('performance')}</span>
              <span className="text-5xl font-black text-foreground tabular-nums">{Math.round(serializedAttempt.percentage)}%</span>
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

          <AuditDetail 
            questions={questions}
            attemptId={serializedAttempt._id}
            translations={{
              auditDetail: t('auditDetail'),
              viewExplanation: t('viewExplanation'),
              explanation: t('explanation'),
              module: t('module'),
              source: t('source'),
              btnCreateAllegation: ta('btnCreateAllegation'),
              reasonPlaceholder: ta('reasonPlaceholder'),
              btnCancel: ta('btnCancel'),
              btnSubmit: ta('btnSubmit'),
              toastSuccess: ta('toastSuccess'),
              toastError: ta('toastError')
            }}
          />

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
  });
}
