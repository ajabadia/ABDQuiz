'use client';

import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface QuizQuestionProps {
  qs: {
    questionText: string;
    options: string[];
    correctOptionIndex: number;
    module: string;
    source: string;
  };
  selectedOption: number | null;
  onSelect: (idx: number) => void;
  showFeedback: boolean;
  isSubmitting: boolean;
}

export default function QuizQuestion({
  qs,
  selectedOption,
  onSelect,
  showFeedback,
  isSubmitting
}: QuizQuestionProps) {
  const t = useTranslations('quiz');
  // Refresh comment to trigger Turbopack re-sync of translation bundles

  return (
    <div className="flex flex-col gap-10 max-w-4xl mx-auto w-full py-10 px-4">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
           <Badge variant="outline" className="rounded-none border-white/10 bg-white/5 text-muted-foreground font-mono text-[9px] uppercase tracking-tighter px-2 py-0.5">
            {t('module')}: {qs.module}
          </Badge>
          <Badge variant="outline" className="rounded-none border-white/10 bg-white/5 text-muted-foreground font-mono text-[9px] uppercase tracking-tighter px-2 py-0.5">
            {t('source')}: {qs.source}
          </Badge>
        </div>
        
        <h1 className="text-3xl md:text-4xl font-bold leading-tight tracking-tight text-foreground antialiased">
          {qs.questionText}
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-4 w-full" role="group" aria-label="Options">
        {qs.options.map((option: string, idx: number) => (
          <button aria-label={`${String.fromCharCode(65 + idx)}: ${option}`}
            key={idx}
            disabled={isSubmitting || showFeedback}
            onClick={() => onSelect(idx)}
            className={cn(
              "group flex items-start gap-5 border p-5 text-left transition-all duration-150 outline-none rounded-none",
              "bg-card text-foreground border-white/10 hover:border-white/20",
              selectedOption === idx && "border-primary bg-primary/5 shadow-[0_0_15px_rgba(0,240,255,0.05)]",
              showFeedback && idx === qs.correctOptionIndex && "border-green-500/50 bg-green-500/10",
              showFeedback && selectedOption === idx && idx !== qs.correctOptionIndex && "border-destructive/50 bg-destructive/10",
              (isSubmitting || showFeedback) && "cursor-default"
            )}
          >
            <span className={cn(
              "flex-shrink-0 w-8 h-8 flex items-center justify-center font-mono text-xs border transition-colors",
              selectedOption === idx ? "border-primary text-primary bg-primary/10" : "border-white/10 text-muted-foreground group-hover:border-white/20",
              showFeedback && idx === qs.correctOptionIndex && "border-green-500 text-green-500 bg-green-500/10",
              showFeedback && selectedOption === idx && idx !== qs.correctOptionIndex && "border-destructive text-destructive bg-destructive/10"
            )}>
              {String.fromCharCode(65 + idx)}
            </span>
            <span className="pt-1 text-sm md:text-base leading-relaxed">{option}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
