'use client';

import { cn } from "@/lib/utils";
import { Clock, Terminal } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useTranslations } from "next-intl";

interface QuizHeaderProps {
  currentIndex: number;
  totalQuestions: number;
  globalTime: number;
  questionTime: number;
  isGlobalLow: boolean;
  isQuestionLow: boolean;
  formatTime: (s: number) => string;
}

export function QuizHeader({
  currentIndex,
  totalQuestions,
  globalTime,
  questionTime,
  isGlobalLow,
  isQuestionLow,
  formatTime
}: QuizHeaderProps) {
  const t = useTranslations('common');

  return (
    <header className="flex flex-col gap-6 border-b border-white/10 pb-8" role="banner">
      <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.3em] text-muted-foreground uppercase antialiased">
        <div className={cn(
          "flex items-center gap-3 px-4 py-2 bg-white/[0.03] border border-white/5 transition-all", 
          isGlobalLow && "text-primary border-primary/40 animate-pulse bg-primary/5 shadow-[0_0_10px_rgba(0,240,255,0.1)]"
        )} aria-label={`${t('missionClock')}: ${formatTime(globalTime)}`}>
          <Clock className="w-4 h-4" aria-hidden="true" />
          <span>{t('missionClock')}: {formatTime(globalTime)}</span>
        </div>
        
        <div className={cn(
          "flex items-center gap-3 px-4 py-2 bg-white/[0.03] border border-white/5 transition-all", 
          isQuestionLow && "text-primary border-primary/40 animate-pulse bg-primary/5 shadow-[0_0_10px_rgba(0,240,255,0.1)]"
        )} aria-label={`${t('taskTtl')}: ${questionTime}S`}>
          <Terminal className="w-4 h-4" aria-hidden="true" />
          <span>{t('taskTtl')}: {questionTime}S</span>
        </div>
      </div>

      <div className="flex items-center gap-8">
        <div className="flex flex-col gap-2.5 flex-1" role="region" aria-label="Progress">
          <div className="flex justify-between items-end">
            <span className="font-mono text-[10px] uppercase text-muted-foreground tracking-[0.2em]">{t('progress')}</span>
            <span className="font-mono text-xs font-bold text-primary">
              {Math.round(((currentIndex + 1) / totalQuestions) * 100)}%
            </span>
          </div>
          <Progress value={((currentIndex + 1) / totalQuestions) * 100} className="h-1 bg-white/5" />
        </div>
        
        <div className="flex flex-col items-center justify-center px-8 border-l border-white/10 h-14" aria-label={t('auditIndex')}>
          <span className="text-3xl font-black tabular-nums tracking-tighter text-foreground">
            {String(currentIndex + 1).padStart(2, '0')}<span className="text-white/10 mx-1" aria-hidden="true">/</span>{String(totalQuestions).padStart(2, '0')}
          </span>
          <span className="font-mono text-[8px] uppercase tracking-[0.3em] text-muted-foreground mt-1">{t('auditIndex')}</span>
        </div>
      </div>
    </header>
  );
}
