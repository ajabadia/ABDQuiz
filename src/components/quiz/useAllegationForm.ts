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
