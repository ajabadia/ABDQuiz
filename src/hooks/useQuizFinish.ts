'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { finishQuizAction } from '@/actions/quiz';
import { toast } from 'sonner';

export function useQuizFinish(attemptId: string, attemptToken: string | undefined) {
  const router = useRouter();
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [showOmittedConfirm, setShowOmittedConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const confirmFinish = useCallback(async () => {
    setIsSubmitting(true);
    setShowFinishConfirm(false);
    try {
      const result = await finishQuizAction(attemptId, attemptToken);
      if (result.success) {
        router.push(`/quiz/${attemptId}/results`);
      }
    } catch {
      toast.error('Fallo al finalizar el examen');
      setIsSubmitting(false);
    }
  }, [attemptId, attemptToken, router]);

  return {
    confirmFinish,
    showFinishConfirm,
    setShowFinishConfirm,
    showOmittedConfirm,
    setShowOmittedConfirm,
    isSubmitting,
    setIsSubmitting,
  };
}
