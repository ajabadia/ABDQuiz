'use client';

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
