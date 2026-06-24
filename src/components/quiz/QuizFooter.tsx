'use client';

/**
 * @purpose Renderiza el pie de página para un componente de quiz, incluyendo botones de navegación y acciones según el modo y estado del quiz.
 * @purpose_en Renders the footer for a quiz component, including navigation buttons and action buttons based on the quiz mode and state.
 * @refactorable false
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:3,sig:k41kb8
 * @lastUpdated 2026-06-23T19:49:43.256Z
 */

import { SkipForward, Activity, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

interface QuizFooterProps {
  onNext: (isDraft?: boolean) => void;
  onSkip: () => void;
  onShowFeedback: () => void;
  onPrevious?: () => void;
  isSubmitting: boolean;
  showFeedback: boolean;
  selectedOption: number | null;
  mode: 'exam' | 'training';
  isLast: boolean;
  allowReviewPrevious?: boolean;
  hasPrevious?: boolean;
}

export default function QuizFooter({
  onNext,
  onSkip,
  onShowFeedback,
  onPrevious,
  isSubmitting,
  showFeedback,
  selectedOption,
  mode,
  isLast,
  allowReviewPrevious,
  hasPrevious
}: QuizFooterProps) {
  const t = useTranslations('quiz');
  // Refresh comment to trigger Turbopack re-sync

  return (
    <footer className="border-t border-white/10 pt-8 pb-12 flex justify-between items-center bg-background/95 backdrop-blur-xl sticky bottom-0 z-50 px-2" role="contentinfo">
      <div className="flex gap-4">
        {allowReviewPrevious && hasPrevious && onPrevious && (
          <button 
            type="button"
            aria-label="Volver a la pregunta anterior" 
            className="btn-skip-console border-white/10 hover:border-white/20 text-muted-foreground hover:text-foreground mr-2" 
            onClick={onPrevious} 
            disabled={isSubmitting}
          >
            <ChevronLeft className="w-4 h-4 mr-2" aria-hidden="true" />
            Anterior
          </button>
        )}
        <button aria-label={t('bypassTask')} className="btn-skip-console" onClick={onSkip} disabled={isSubmitting}>
          <SkipForward className="w-3.5 h-3.5 mr-2" aria-hidden="true" />
          {t('skip')}
        </button>
      </div>

      <div className="flex gap-6">
        {mode === 'training' && !showFeedback && (
          <Button 
            variant="ghost"
            size="lg"
            className="rounded-none font-mono text-[10px] tracking-[0.3em] uppercase px-10 h-14 border border-white/5 text-muted-foreground hover:bg-white/5 hover:text-foreground transition-all"
            onClick={onShowFeedback}
            disabled={selectedOption === null || isSubmitting}
            aria-label={t('analyzeLogic')}
          >
            <Activity className="w-4 h-4 mr-3" aria-hidden="true" />
            {t('analyzeLogic')}
          </Button>
        )}
        
        <button aria-label={isLast ? t('terminateManifest') : t('commitProceed')} className="btn-primary-console" onClick={() => onNext(false)} disabled={isSubmitting || (mode === 'training' && !showFeedback && selectedOption !== null)}>
          {isLast ? t('terminateManifest') : t('commitProceed')}
          <ChevronRight className="w-4 h-4 ml-2" aria-hidden="true" />
        </button>
      </div>
    </footer>
  );
}
