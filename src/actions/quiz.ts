'use server';

import { QuizService } from '@/services/quiz/quizService';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import connectDB from '@/lib/database/mongodb';
import ExamAttempt from '@/models/ExamAttempt';
import { ensureIndustrialAccess } from '@/lib/session';

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

/**
 * Anula un intento de examen de forma lógica para permitir un reintento
 */
export async function invalidateAttemptAction(attemptId: string) {
  try {
    const admin = await ensureIndustrialAccess('ADMIN');
    await connectDB();
    
    const attempt = await ExamAttempt.findById(attemptId);
    if (!attempt) {
      return { success: false, error: 'Intento de examen no encontrado' };
    }
    
    attempt.isInvalidated = true;
    attempt.invalidatedBy = admin.email || admin.id;
    attempt.invalidatedAt = new Date();
    
    await attempt.save();
    
    revalidatePath('/admin/attempts');
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [INVALIDATE_ATTEMPT_ACTION_ERROR]:', message);
    return { success: false, error: message };
  }
}

/**
 * Recupera todos los intentos de examen para el tenant actual
 */
export async function getAttemptsAction() {
  try {
    const admin = await ensureIndustrialAccess('ADMIN');
    await connectDB();
    
    const attempts = await ExamAttempt.find({
      tenantId: admin.tenantId
    })
    .populate('examConfigId')
    .sort({ createdAt: -1 })
    .lean();
    
    return JSON.parse(JSON.stringify(attempts));
  } catch (error: unknown) {
    console.error('❌ Error fetching attempts:', error);
    return [];
  }
}
