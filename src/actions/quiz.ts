/**
 * @purpose Gestiona intentos de pruebas y configuraciones de exámenes.
 * @purpose_en Manages quiz attempts and exam configurations.
 * @refactorable true (contains multiple actions and business logic)
 * @classification Business Service
 * @complexity Medium
 * @fingerprint exports:6,imports:13,sig:1e43k35
 * @lastUpdated 2026-06-26T10:01:58.663Z
 */

'use server';

import { QuizService } from '@/services/quiz/quizService';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getIndustrialSession } from '@ajabadia/satellite-sdk/auth-middleware';
import { connectDB, withTenantContext } from '@ajabadia/satellite-sdk/db';
import { logger } from '@ajabadia/satellite-sdk/logger';
import { resolveTargetTenantContext, rateLimitMongodb } from '@ajabadia/satellite-sdk/utils';
import ExamAttempt from '@/models/ExamAttempt';
import { ensureAdminOrProfessor } from '@/lib/auth/ensureQuizAccess';
import { AnalyticsSyncService } from '@/services/quiz/analyticsSyncService';
import { publishAttemptStarted, publishAttemptCompleted } from '@/services/quiz/quiz-publisher';

import type { SerializedAttempt } from './quizTypes';
import { sanitizeAttempt } from './quizHelpers';


/**
 * Inicia un nuevo examen basado en una configuración parametrizada
 */
export async function startQuizAction(examConfigId: string) {
  return withTenantContext(async () => {
    // 🚦 Rate limit: 10 starts per 60s per IP
    const ip = await rateLimitMongodb.getClientIpAsync();
    const allowed = await rateLimitMongodb.check(ip, 'submission', 10, 60);
    if (!allowed) {
      throw new Error('Demasiados intentos. Intenta de nuevo en un minuto.');
    }

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
      await logger.audit({
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

      // Fire-and-forget event bus notification
      publishAttemptStarted(attemptId, activeTenantId, userId, examConfigId);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await logger.audit({
        tenantId: 'unknown',
        action: 'START_QUIZ_ERROR',
        entityType: 'EXAM',
        entityId: examConfigId,
        userId: 'system',
        userEmail: 'system@abd.com',
        changedFields: { error: message, examConfigId },
      });
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
  attemptToken?: string;
  textAnswer?: string;
  attachmentUrl?: string;
}) {
  return withTenantContext(async () => {
    // 🚦 Rate limit: 60 answer submissions per 60s per IP
    const ip = await rateLimitMongodb.getClientIpAsync();
    const allowed = await rateLimitMongodb.check(ip, 'submission', 60, 60);
    if (!allowed) {
      throw new Error('Demasiadas respuestas. Intenta de nuevo en un minuto.');
    }

    try {
      const session = await getIndustrialSession();
      if (!session?.user?.id) throw new Error('Unauthorized');
      
      await QuizService.submitAnswer(
        formData.attemptId,
        formData.questionIndex,
        formData.selectedOptionIndex,
        formData.timeSpent,
        formData.status,
        session.user.id,
        formData.attemptToken,
        formData.textAnswer,
        formData.attachmentUrl
      );
      
      revalidatePath(`/quiz/${formData.attemptId}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await logger.audit({
        tenantId: 'unknown',
        action: 'SUBMIT_ANSWER_ERROR',
        entityType: 'EXAM',
        entityId: formData.attemptId,
        userId: 'system',
        userEmail: 'system@abd.com',
        changedFields: { error: message, attemptId: formData.attemptId },
      });
      console.error('❌ [SUBMIT_ANSWER_ACTION_ERROR]:', message, 'AttemptId:', formData.attemptId);
      throw new Error(`Submission failed: ${message}`);
    }
  });
}

/**
 * §12.D — Heartbeat: el cliente envía un latido cada 30s mientras el examen está activo.
 * Si el servidor detecta que el intento ya finalizó, informa al cliente para que detenga heartbeats.
 */
export async function heartbeatAction(attemptId: string) {
  return withTenantContext(async () => {
    const session = await getIndustrialSession();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    try {
      const result = await QuizService.sendHeartbeat(attemptId, session.user.id);
      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await logger.audit({
        tenantId: 'unknown',
        action: 'HEARTBEAT_ERROR',
        entityType: 'EXAM',
        entityId: attemptId,
        userId: 'system',
        userEmail: 'system@abd.com',
        changedFields: { error: message, attemptId },
      });
      console.error('❌ [HEARTBEAT_ERROR]:', message);
      return { success: false, error: message };
    }
  });
}

/**
 * Finaliza el examen
 */
export async function finishQuizAction(attemptId: string, attemptToken?: string, tenantIdParam?: string) {
  const explicitCtx = await resolveTargetTenantContext(tenantIdParam);
  
  return withTenantContext(async () => {
    // 🚦 Rate limit: 20 finishes per 60s per IP
    const ip = await rateLimitMongodb.getClientIpAsync();
    const allowed = await rateLimitMongodb.check(ip, 'submission', 20, 60);
    if (!allowed) {
      throw new Error('Demasiados intentos. Intenta de nuevo en un minuto.');
    }

    try {
      const session = await getIndustrialSession();
      if (!session?.user?.id || !session?.user?.tenantId) throw new Error('Unauthorized');

      await QuizService.finishExam(attemptId, session.user.id, attemptToken);
      
      const activeTenantId = explicitCtx?.tenantId || session.user.tenantId;

      // Decoupled sync for course and user analytics (fire-and-forget)
      AnalyticsSyncService.sync(attemptId, activeTenantId, session.user.id);

      // Fire-and-forget event bus notification
      publishAttemptCompleted(attemptId, activeTenantId, session.user.id);
      
      await logger.audit({
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
      await logger.audit({
        tenantId: explicitCtx?.tenantId || 'unknown',
        action: 'FINISH_QUIZ_ERROR',
        entityType: 'EXAM',
        entityId: attemptId,
        userId: 'system',
        userEmail: 'system@abd.com',
        changedFields: { error: message, attemptId },
      });
      console.error('Failed to finish quiz:', message);
      throw new Error('Finalization failed: ' + message);
    }
  }, explicitCtx);
}

/**
 * Anula un intento de examen de forma lógica para permitir un reintento
 */
export async function invalidateAttemptAction(attemptId: string, tenantIdParam?: string) {
  const explicitCtx = await resolveTargetTenantContext(tenantIdParam);
  
  return withTenantContext(async () => {
    try {
      const admin = await ensureAdminOrProfessor();
      await connectDB();
      
      const attempt = await ExamAttempt.findById(attemptId);
      if (!attempt) {
        return { success: false, error: 'Intento de examen no encontrado' };
      }
      
      // Anti-IDOR Guard
      const activeTenantId = explicitCtx?.tenantId || admin.tenantId;
      if (attempt.tenantId !== activeTenantId && admin.role !== 'SUPER_ADMIN') {
        return { success: false, error: 'Acceso no autorizado' };
      }
      
      const targetTenantId = attempt.tenantId;
      const previousState = attempt.toObject() as unknown as Record<string, unknown>;
      attempt.isInvalidated = true;
      attempt.invalidatedBy = admin.email || admin.id;
      attempt.invalidatedAt = new Date();
      
      await attempt.save();
      
      // Log the invalidation event
      await logger.audit({
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
      await logger.audit({
        tenantId: explicitCtx?.tenantId || 'unknown',
        action: 'INVALIDATE_ATTEMPT_ERROR',
        entityType: 'EXAM',
        entityId: attemptId,
        userId: 'system',
        userEmail: 'system@abd.com',
        changedFields: { error: message, attemptId },
      });
      console.error('❌ [INVALIDATE_ATTEMPT_ACTION_ERROR]:', message);
      return { success: false, error: message };
    }
  }, explicitCtx);
}

/**
 * Recupera todos los intentos de examen para el tenant actual
 */
export async function getAttemptsAction(tenantIdParam?: string) {
  const explicitCtx = await resolveTargetTenantContext(tenantIdParam);
  
  return withTenantContext(async () => {
    try {
      const admin = await ensureAdminOrProfessor();
      await connectDB();
      
      const activeTenantId = explicitCtx?.tenantId || admin.tenantId;
      
      const attempts = await ExamAttempt.find({
        tenantId: activeTenantId
      })
      .populate('examConfigId')
      .sort({ createdAt: -1 })
      .lean();
      
      return (attempts as unknown as Record<string, unknown>[]).map(sanitizeAttempt);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      await logger.audit({
        tenantId: explicitCtx?.tenantId || 'unknown',
        action: 'FETCH_ATTEMPTS_ERROR',
        entityType: 'EXAM',
        entityId: 'unknown',
        userId: 'system',
        userEmail: 'system@abd.com',
        changedFields: { error: msg },
      });
      console.error('❌ Error fetching attempts:', msg);
      throw new Error(msg);
    }
  }, explicitCtx);
}
