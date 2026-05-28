'use server';

import { withTenantContext } from '@ajabadia/satellite-sdk';
import { resolveTargetTenantContext } from '@/lib/tenant-resolver';
import { connectDB } from '@ajabadia/satellite-sdk';
import ExamAttempt from '@/models/ExamAttempt';
import { ensureAdminOrProfessor } from '@/lib/auth/ensureQuizAccess';
import { logger } from '@ajabadia/satellite-sdk';

export interface SerializedGradingAttempt {
  _id: string;
  userId: string;
  mode: 'training' | 'mock';
  score: number;
  percentage: number;
  startedAt: string;
  endedAt?: string;
  status: 'in_progress' | 'completed' | 'timeout';
  gradingStatus: 'auto_graded' | 'pending_manual_review' | 'manually_graded';
  gradedBy?: string;
  gradedAt?: string;
  examConfigId?: {
    _id: string;
    name: string;
    passThreshold: number;
  };
}

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

    return (attempts as unknown as Record<string, unknown>[]).map((a) => {
      const result: SerializedGradingAttempt = {
        _id: (a._id as { toString(): string }).toString(),
        userId: (a.userId as { toString(): string })?.toString() || '',
        mode: a.mode as 'training' | 'mock',
        score: a.score as number,
        percentage: a.percentage as number,
        startedAt: (a.startedAt as Date).toISOString(),
        status: a.status as 'in_progress' | 'completed' | 'timeout',
        gradingStatus: a.gradingStatus as 'auto_graded' | 'pending_manual_review' | 'manually_graded',
      };

      if (a.endedAt) result.endedAt = (a.endedAt as Date).toISOString();
      if (a.gradedBy) result.gradedBy = a.gradedBy as string;
      if (a.gradedAt) result.gradedAt = (a.gradedAt as Date).toISOString();

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
  }, explicitCtx);
}

export interface QuestionGradingData {
  questionIndex: number;
  manualPointsAwarded: number;
  feedback: string;
}

export interface AttemptDetailQuestion {
  questionIndex: number;
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  selectedOptionIndex?: number | null;
  manualTextAnswer?: string;
  manualPointsAwarded?: number;
  feedback?: string;
  isCorrect: boolean;
  status: string;
  timeSpentSeconds: number;
  maxPoints: number;
}

export interface AttemptDetail {
  _id: string;
  userId: string;
  examConfigId?: { _id: string; name: string };
  status: string;
  gradingStatus: string;
  gradedBy?: string;
  gradedAt?: string;
  score: number;
  percentage: number;
  questions: AttemptDetailQuestion[];
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

    const questionsArr = a.questions as Array<Record<string, unknown>> | undefined;

    return {
      _id: (a._id as { toString(): string }).toString(),
      userId: (a.userId as { toString(): string })?.toString() || '',
      examConfigId: a.examConfigId
        ? {
            _id: ((a.examConfigId as Record<string, unknown>)._id as { toString(): string }).toString(),
            name: (a.examConfigId as Record<string, unknown>).name as string,
          }
        : undefined,
      status: a.status as string,
      gradingStatus: a.gradingStatus as string,
      gradedBy: a.gradedBy as string | undefined,
      gradedAt: (a.gradedAt as Date)?.toISOString(),
      score: a.score as number,
      percentage: a.percentage as number,
      questions: (questionsArr || []).map((q: Record<string, unknown>, i: number) => {
        const snapshot = q.questionSnapshot as Record<string, unknown> | undefined;
        const diff = (snapshot?.difficulty as string) || 'medium';
        const basePoints: Record<string, number> = { easy: 1, medium: 1, hard: 1 };
        return {
          questionIndex: i,
          questionText: (snapshot?.questionText as string) || '',
          options: (snapshot?.options as string[]) || [],
          correctOptionIndex: (snapshot?.correctOptionIndex as number) ?? 0,
          selectedOptionIndex: q.selectedOptionIndex as number | null | undefined,
          manualTextAnswer: q.manualTextAnswer as string | undefined,
          manualPointsAwarded: q.manualPointsAwarded as number | undefined,
          feedback: q.feedback as string | undefined,
          isCorrect: q.isCorrect as boolean,
          status: q.status as string,
          timeSpentSeconds: q.timeSpentSeconds as number,
          maxPoints: basePoints[diff] || 1,
        };
      }),
    };
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
    try {
      const admin = await ensureAdminOrProfessor();
      await connectDB();

      const attempt = await ExamAttempt.findById(attemptId);
      if (!attempt) return { success: false, error: 'Intento no encontrado' };
      const activeTenantId = explicitCtx?.tenantId || admin.tenantId;
      // Verify space or course permission scope before grading
      const examConfigIdStr = attempt.examConfigId ? attempt.examConfigId.toString() : '';
      if (examConfigIdStr) {
        const { requireQuizScope } = await import('@/lib/auth/scope-guard');
        const scopeCheck = await requireQuizScope(
          admin.id,
          activeTenantId,
          examConfigIdStr,
          'course',
          'CREATOR'
        );
        if (!scopeCheck.granted && admin.role !== 'SUPER_ADMIN') {
          return { success: false, error: 'Acceso denegado: Rol contextual insuficiente en el espacio formativo' };
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
      console.error('❌ [GRADING_ERROR]:', message);
      return { success: false, error: message };
    }
  }, explicitCtx);
}
