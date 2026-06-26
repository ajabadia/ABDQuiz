/**
 * @purpose Gestiona operaciones de calificación para intentos de exámenes en la aplicación ABDQuiz, incluyendo la recuperación de intentos para la calificación y la calificación manual de intentos individuales.
 * @purpose_en Manages grading operations for exam attempts in the ABDQuiz application, including fetching attempts for grading and manually grading individual attempts.
 * @refactorable true (contains multiple functions with distinct responsibilities)
 * @classification Business Service
 * @complexity Medium
 * @fingerprint exports:3,imports:7,sig:1jrmbqk
 * @lastUpdated 2026-06-26T10:01:34.429Z
 */

'use server';

import { withTenantContext, connectDB } from '@ajabadia/satellite-sdk/db';
import { logger } from '@ajabadia/satellite-sdk/logger';
import { resolveTargetTenantContext, rateLimitMongodb } from '@ajabadia/satellite-sdk/utils';
import ExamAttempt from '@/models/ExamAttempt';
import { ensureAdminOrProfessor } from '@/lib/auth/ensureQuizAccess';

import type { SerializedGradingAttempt, AttemptDetail, QuestionGradingData } from './gradingTypes';
import { sanitizeGradingAttempt, buildAttemptDetail } from './gradingTypes';

/**
 * Retrieves all completed/timeout attempts for the grading inbox.
 * Filterable by gradingStatus.
 */
export async function getAttemptsForGradingAction(gradingFilter?: string, tenantIdParam?: string) {
  const explicitCtx = await resolveTargetTenantContext(tenantIdParam);
  
  return withTenantContext(async () => {
    const admin = await ensureAdminOrProfessor();
    await connectDB();

    const activeTenantId = explicitCtx?.tenantId || admin.tenantId;
    const query: Record<string, unknown> = {
      tenantId: activeTenantId,
      status: { $in: ['completed', 'timeout'] },
    };

    if (gradingFilter && gradingFilter !== 'all') {
      query.gradingStatus = gradingFilter;
    }

    const attempts = await ExamAttempt.find(query)
      .populate('examConfigId')
      .sort({ endedAt: -1 })
      .lean();

    return (attempts as unknown as Record<string, unknown>[]).map(sanitizeGradingAttempt);
  }, explicitCtx);
}

/**
 * Fetches the full detail of a single attempt for the correction view.
 */
export async function getAttemptDetailAction(attemptId: string, tenantIdParam?: string): Promise<AttemptDetail | null> {
  const explicitCtx = await resolveTargetTenantContext(tenantIdParam);
  
  return withTenantContext(async () => {
    const admin = await ensureAdminOrProfessor();
    await connectDB();

    const attempt = await ExamAttempt.findById(attemptId)
      .populate('examConfigId')
      .lean();

    if (!attempt) return null;
    const a = attempt as unknown as Record<string, unknown>;
    const activeTenantId = explicitCtx?.tenantId || admin.tenantId;
    if (a.tenantId !== activeTenantId && admin.role !== 'SUPER_ADMIN') return null;

    return buildAttemptDetail(a);
  });
}

/**
 * Submits manual grades for an attempt, recalculates score and marks as manually_graded.
 */
export async function submitManualGradingAction(
  attemptId: string,
  grades: QuestionGradingData[],
  tenantIdParam?: string
) {
  const explicitCtx = await resolveTargetTenantContext(tenantIdParam);
  
  return withTenantContext(async () => {
    // 🚦 Rate limit grading: 30 submissions per 60s per IP
    const ip = await rateLimitMongodb.getClientIpAsync();
    const allowed = await rateLimitMongodb.check(ip, 'submission', 30, 60);
    if (!allowed) {
      return { success: false, error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' };
    }

    try {
      const admin = await ensureAdminOrProfessor();
      await connectDB();

      const attempt = await ExamAttempt.findById(attemptId);
      if (!attempt) return { success: false, error: 'Intento no encontrado' };
      const activeTenantId = explicitCtx?.tenantId || admin.tenantId;
      // Verify space or course permission scope before grading
      const examConfigIdStr = attempt.examConfigId ? attempt.examConfigId.toString() : '';
      if (examConfigIdStr) {
        const { assertAccess } = await import('@/lib/auth/abac');
        try {
          await assertAccess({
            userId: admin.id,
            tenantId: activeTenantId,
            resource: 'quiz:attempt',
            action: 'grade',
            context: {
              examConfigId: examConfigIdStr,
              attemptId
            }
          });
        } catch {
          if (admin.role !== 'SUPER_ADMIN') {
            return { success: false, error: 'Acceso denegado: Rol contextual insuficiente en el espacio formativo' };
          }
        }
      }

      // Apply grades to each question
      for (const g of grades) {
        const question = attempt.questions[g.questionIndex];
        if (!question) continue;
        question.manualPointsAwarded = g.manualPointsAwarded;
        if (g.feedback?.trim()) {
          question.feedback = g.feedback;
        }
      }

      // Recalculate total score using manual points where provided
      let totalScore = 0;
      let maxPossible = 0;

      for (const q of attempt.questions) {
        const diff = q.questionSnapshot?.difficulty || 'medium';
        const basePoints: Record<string, number> = { easy: 1, medium: 1, hard: 1 };
        const pointsForCorrect = basePoints[diff] || 1;
        maxPossible += pointsForCorrect;

        if (q.manualPointsAwarded !== undefined && q.manualPointsAwarded >= 0) {
          totalScore += q.manualPointsAwarded;
        } else if (q.isCorrect) {
          totalScore += pointsForCorrect;
        }
      }

      attempt.score = Math.max(0, totalScore);
      attempt.percentage = maxPossible > 0 ? parseFloat(((attempt.score / maxPossible) * 100).toFixed(2)) : 0;
      attempt.gradingStatus = 'manually_graded';
      attempt.gradedBy = admin.email || admin.id;
      attempt.gradedAt = new Date();

      await attempt.save();

      await logger.audit({
        tenantId: admin.tenantId,
        action: 'EXAM_ATTEMPT_MANUALLY_GRADED',
        entityType: 'EXAM',
        entityId: attemptId,
        userId: admin.id,
        userEmail: admin.email,
        changedFields: {
          gradingStatus: 'manually_graded',
          gradedBy: attempt.gradedBy,
          gradedAt: attempt.gradedAt.toISOString(),
          score: attempt.score,
          percentage: attempt.percentage,
        },
      });

      return { success: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await logger.audit({
        tenantId: explicitCtx?.tenantId || 'unknown',
        action: 'GRADING_ERROR',
        entityType: 'EXAM',
        entityId: attemptId,
        userId: 'system',
        userEmail: 'system@abd.com',
        changedFields: { error: message, attemptId },
      });
      console.error('❌ [GRADING_ERROR]:', message);
      return { success: false, error: message };
    }
  }, explicitCtx);
}
