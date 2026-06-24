'use client';

/**
 * @purpose Gestiona tiempos de espera de preguntas, maneja tanto tiempos globales como específicos de pregunta, proporciona retroalimentación y navega a la página de resultados.
 * @purpose_en Manages quiz timeouts by handling both global and question-specific timeouts, providing feedback, and navigating to the results page.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:1,imports:5,sig:3gx5rf
 * @lastUpdated 2026-06-23T19:50:56.008Z
 */

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { finishQuizAction } from '@/actions/quiz';
import { toast } from 'sonner';

export function useQuizTimeout(
  attemptId: string,
  attemptToken: string | undefined,
  showFeedback: boolean,
  handleNext: (isTimeout: boolean) => Promise<void>,
) {
  const router = useRouter();
  const t = useTranslations('quiz');

  const handleGlobalTimeout = useCallback(() => {
    toast.error(t('globalTimeout'));
    finishQuizAction(attemptId, attemptToken).then(() => {
      router.push(`/quiz/${attemptId}/results`);
    });
  }, [attemptId, attemptToken, router, t]);

  const handleQuestionTimeout = useCallback(() => {
    if (!showFeedback) {
      toast.warning(t('questionTimeout'));
      handleNext(true).catch(() => {});
    }
  }, [showFeedback, handleNext, t]);

  return { handleGlobalTimeout, handleQuestionTimeout };
}
