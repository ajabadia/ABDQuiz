'use server';

import { QuizService } from '@/services/quiz/quizService';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const DEFAULT_TENANT = process.env.SINGLE_TENANT_ID || "abd_global";
const FAKE_USER_ID = "user_001"; // MVP: Usuario único

/**
 * Inicia un nuevo examen basado en una configuración parametrizada
 */
export async function startQuizAction(examConfigId: string) {
  let attemptId: string | null = null;
  
  try {
    console.log(`🚀 Attempting to start quiz with config: ${examConfigId} for tenant: ${DEFAULT_TENANT}`);
    
    const attempt = await QuizService.createExamAttempt(
      FAKE_USER_ID,
      DEFAULT_TENANT,
      examConfigId
    );
    
    attemptId = attempt._id.toString();
    console.log(`✅ Quiz attempt created: ${attemptId}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Failed to start quiz:', message);
    throw new Error(`Critical Error: ${message}`);
  }

  // Redirección fuera del bloque try-catch (requerido por Next.js)
  if (attemptId) {
    redirect(`/quiz/${attemptId}`);
  }
}

/**
 * Envía una respuesta
 */
export async function submitAnswerAction(formData: {
  attemptId: string;
  questionIndex: number;
  selectedOptionIndex: number | null;
  timeSpent: number;
  status: 'correcta' | 'incorrecta' | 'no_respondida' | 'no_respondida_por_tiempo';
}) {
  try {
    await QuizService.submitAnswer(
      formData.attemptId,
      formData.questionIndex,
      formData.selectedOptionIndex,
      formData.timeSpent,
      formData.status
    );
    
    revalidatePath(`/quiz/${formData.attemptId}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [SUBMIT_ANSWER_ACTION_ERROR]:', message, 'AttemptId:', formData.attemptId);
    throw new Error(`Submission failed: ${message}`);
  }
}

/**
 * Finaliza el examen
 */
export async function finishQuizAction(attemptId: string) {
  try {
    await QuizService.finishExam(attemptId);
    revalidatePath(`/quiz/${attemptId}`);
    revalidatePath(`/quiz/${attemptId}/results`);
    
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to finish quiz:', message);
    throw new Error('Finalization failed');
  }
}
