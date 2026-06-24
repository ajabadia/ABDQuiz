'use client';

/**
 * @purpose Gestiona el proceso de finalización del quiz, manejando la confirmación del usuario, enviando el quiz y redirigiendo a la página de resultados.
 * @purpose_en Manages the quiz finish process by handling user confirmation, submitting the quiz, and navigating to the results page.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:1,imports:4,sig:jih5z7
 * @lastUpdated 2026-06-23T19:50:48.240Z
 */

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
