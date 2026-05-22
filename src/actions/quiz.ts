'use server';

import { QuizService } from '@/services/quiz/quizService';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import connectDB from '@/lib/database/mongodb';
import ExamAttempt from '@/models/ExamAttempt';
import { ensureIndustrialAccess, getIndustrialSession } from '@/lib/session';
import { LogsClient } from '@/lib/logs-client';
import { withTenantContext } from '@/lib/database/tenant-model';

const DEFAULT_TENANT = process.env.SINGLE_TENANT_ID || "abd_global";
const FAKE_USER_ID = "user_001"; // MVP: Usuario único

/**
 * Inicia un nuevo examen basado en una configuración parametrizada
 */
export async function startQuizAction(examConfigId: string) {
  return withTenantContext(async () => {
    let attemptId: string | null = null;
    
    try {
      const session = await getIndustrialSession();
      const activeTenantId = session.user?.tenantId || DEFAULT_TENANT;
      
      const attempt = await QuizService.createExamAttempt(
        session.user?.id || FAKE_USER_ID,
        activeTenantId,
        examConfigId
      );
      
      attemptId = attempt._id.toString();
      console.log(`✅ Quiz attempt created: ${attemptId}`);
      
      // Log the start attempt
      await LogsClient.log({
        tenantId: activeTenantId,
        action: 'EXAM_ATTEMPT_STARTED',
        entityType: 'EXAM',
        entityId: attemptId,
        userId: session.user?.id || FAKE_USER_ID,
        userEmail: session.user?.email || 'student@abd.com',
        changedFields: {
          examConfigId
        }
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to start quiz:', message);
      throw new Error(`Critical Error: ${message}`);
    }

    // Redirección fuera del bloque try-catch (requerido por Next.js)
    if (attemptId) {
      redirect(`/quiz/${attemptId}`);
    }
  });
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
  return withTenantContext(async () => {
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
  });
}

/**
 * Finaliza el examen
 */
export async function finishQuizAction(attemptId: string) {
  return withTenantContext(async () => {
    try {
      await QuizService.finishExam(attemptId);
      
      // Log the finish attempt
      const session = await getIndustrialSession();
      const activeTenantId = session.user?.tenantId || DEFAULT_TENANT;
      await LogsClient.log({
        tenantId: activeTenantId,
        action: 'EXAM_ATTEMPT_COMPLETED',
        entityType: 'EXAM',
        entityId: attemptId,
        userId: session.user?.id || FAKE_USER_ID,
        userEmail: session.user?.email || 'student@abd.com',
        changedFields: {
          attemptId
        }
      });
      
      revalidatePath(`/quiz/${attemptId}`);
      revalidatePath(`/quiz/${attemptId}/results`);
      
      return { success: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to finish quiz:', message);
      throw new Error('Finalization failed');
    }
  });
}

/**
 * Anula un intento de examen de forma lógica para permitir un reintento
 */
export async function invalidateAttemptAction(attemptId: string) {
  return withTenantContext(async () => {
    try {
      const admin = await ensureIndustrialAccess('ADMIN');
      await connectDB();
      
      const attempt = await ExamAttempt.findById(attemptId);
      if (!attempt) {
        return { success: false, error: 'Intento de examen no encontrado' };
      }
      
      // Anti-IDOR Guard: standard admin can only invalidate their own tenant's attempts
      if (attempt.tenantId !== admin.tenantId && admin.role !== 'SUPER_ADMIN') {
        return { success: false, error: 'Acceso no autorizado' };
      }
      
      const targetTenantId = attempt.tenantId;
      const previousState = JSON.parse(JSON.stringify(attempt));
      attempt.isInvalidated = true;
      attempt.invalidatedBy = admin.email || admin.id;
      attempt.invalidatedAt = new Date();
      
      await attempt.save();
      
      // Log the invalidation event
      await LogsClient.log({
        tenantId: targetTenantId,
        action: 'EXAM_ATTEMPT_INVALIDATED',
        entityType: 'EXAM',
        entityId: attemptId,
        userId: admin.id,
        userEmail: admin.email,
        changedFields: {
          isInvalidated: true,
          invalidatedBy: attempt.invalidatedBy,
          invalidatedAt: attempt.invalidatedAt
        },
        previousState
      });
      
      revalidatePath('/admin/attempts');
      return { success: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ [INVALIDATE_ATTEMPT_ACTION_ERROR]:', message);
      return { success: false, error: message };
    }
  });
}

/**
 * Recupera todos los intentos de examen para el tenant actual
 */
export async function getAttemptsAction(tenantIdParam?: string) {
  return withTenantContext(async () => {
    try {
      const admin = await ensureIndustrialAccess('ADMIN');
      await connectDB();
      
      // Anti-IDOR Guard: Only allow tenantIdParam if user is SUPER_ADMIN
      let activeTenantId = admin.tenantId;
      if (admin.role === 'SUPER_ADMIN' && tenantIdParam) {
        activeTenantId = tenantIdParam;
      }
      
      const attempts = await ExamAttempt.find({
        tenantId: activeTenantId
      })
      .populate('examConfigId')
      .sort({ createdAt: -1 })
      .lean();
      
      return JSON.parse(JSON.stringify(attempts));
    } catch (error: unknown) {
      console.error('❌ Error fetching attempts:', error);
      return [];
    }
  });
}
