'use server';

import { QuizService } from '@/services/quiz/quizService';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import connectDB from '@/lib/database/mongodb';
import ExamAttempt from '@/models/ExamAttempt';
import { ensureIndustrialAccess, getIndustrialSession } from '@/lib/session';
import { LogsClient } from '@/lib/logs-client';
import { withTenantContext } from '@/lib/database/tenant-model';

export interface SerializedAttempt {
  _id: string;
  userId: string;
  mode: 'training' | 'mock';
  score: number;
  percentage: number;
  startedAt: string;
  endedAt?: string;
  status: 'in_progress' | 'completed' | 'timeout';
  isInvalidated?: boolean;
  invalidatedBy?: string;
  invalidatedAt?: string;
  examConfigId?: {
    _id: string;
    name: string;
    passThreshold: number;
  };
}


/**
 * Inicia un nuevo examen basado en una configuración parametrizada
 */
export async function startQuizAction(examConfigId: string) {
  return withTenantContext(async () => {
    let attemptId: string | null = null;
    
    try {
      const session = await getIndustrialSession();
      if (!session?.user?.id || !session?.user?.tenantId) {
        throw new Error('Unauthorized: Session or User Identity is missing.');
      }
      
      const activeTenantId = session.user.tenantId;
      const userId = session.user.id;
      
      const attempt = await QuizService.createExamAttempt(
        userId,
        activeTenantId,
        examConfigId
      );
      
      attemptId = attempt._id.toString();
      
      // Log the start attempt
      await LogsClient.log({
        tenantId: activeTenantId,
        action: 'EXAM_ATTEMPT_STARTED',
        entityType: 'EXAM',
        entityId: attemptId,
        userId: userId,
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
      const session = await getIndustrialSession();
      if (!session?.user?.id) throw new Error('Unauthorized');
      
      await QuizService.submitAnswer(
        formData.attemptId,
        formData.questionIndex,
        formData.selectedOptionIndex,
        formData.timeSpent,
        formData.status,
        session.user.id
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
      const session = await getIndustrialSession();
      if (!session?.user?.id || !session?.user?.tenantId) throw new Error('Unauthorized');

      await QuizService.finishExam(attemptId, session.user.id);
      
      const activeTenantId = session.user.tenantId;
      await LogsClient.log({
        tenantId: activeTenantId,
        action: 'EXAM_ATTEMPT_COMPLETED',
        entityType: 'EXAM',
        entityId: attemptId,
        userId: session.user.id,
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
      throw new Error('Finalization failed: ' + message);
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
      const previousState = attempt.toObject() as unknown as Record<string, unknown>;
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
      
      // Sanitizar IDs para Server Actions
      return (attempts as unknown as Record<string, unknown>[]).map((a) => {
        const result: SerializedAttempt = {
          _id: (a._id as { toString(): string }).toString(),
          userId: (a.userId as { toString(): string })?.toString() || '',
          mode: a.mode as 'training' | 'mock',
          score: a.score as number,
          percentage: a.percentage as number,
          startedAt: (a.startedAt as Date).toISOString(),
          status: a.status as 'in_progress' | 'completed' | 'timeout',
        };

        if (a.endedAt) result.endedAt = (a.endedAt as Date).toISOString();
        if (a.isInvalidated) result.isInvalidated = a.isInvalidated as boolean;
        if (a.invalidatedBy) result.invalidatedBy = a.invalidatedBy as string;
        if (a.invalidatedAt) result.invalidatedAt = (a.invalidatedAt as Date).toISOString();

        if (a.examConfigId) {
          const config = a.examConfigId as Record<string, unknown>;
          result.examConfigId = {
            _id: (config._id as { toString(): string }).toString(),
            name: config.name as string,
            passThreshold: config.passThreshold as number,
          };
        }

        return result;
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error fetching attempts:', msg);
      throw new Error(msg); // No silenciar errores
    }
  });
}
