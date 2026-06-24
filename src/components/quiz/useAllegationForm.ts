/**
 * @purpose Gestiona la presentación de acusaciones para un intento de prueba, maneja la entrada del usuario y muestra mensajes de éxito o error.
 * @purpose_en Manages the submission of allegations for a quiz attempt, handling user input and displaying success/error messages.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:049d2v
 * @lastUpdated 2026-06-23T19:49:58.582Z
 */

import { toast } from 'sonner';
import { submitAllegationAction } from '@/actions/allegations';

export function useAllegationForm(attemptId: string, translations: {
  toastSuccess: string;
  toastError: string;
}) {
  const submitAllegation = async (questionId: string, reason: string) => {
    if (!reason.trim()) return { success: false };
    try {
      const res = await submitAllegationAction({ examAttemptId: attemptId, questionId, reason: reason.trim() });
      if (res.success) {
        toast.success(translations.toastSuccess);
        return { success: true };
      } else {
        toast.error(translations.toastError);
        return { success: false };
      }
    } catch {
      toast.error(translations.toastError);
      return { success: false };
    }
  };
  return { submitAllegation };
}
