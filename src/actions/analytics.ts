/**
 * @purpose Proporciona datos analíticos para intentos de examen del usuario.
 * @purpose_en Calculates and returns analytics data for user exam attempts.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Business Service
 * @complexity Medium
 * @fingerprint exports:1,imports:5,sig:123fy8q
 * @lastUpdated 2026-06-22T06:34:39.954Z
 */

'use server';

import { connectDB } from '@ajabadia/satellite-sdk';
import ExamAttempt from '@/models/ExamAttempt';
import { ensureIndustrialAccess } from '@ajabadia/satellite-sdk';
import {
  type ModuleAnalytics,
  type DifficultyAnalytics,
  type AttemptSummary,
  type AnalyticsPayload
} from '@/types/quiz';
import { withTenantContext } from '@ajabadia/satellite-sdk';

const getPct = (correct: number, total: number) => (total > 0 ? Math.round((correct / total) * 100) : 0);

export async function getAnalyticsAction(): Promise<{ success: boolean; data?: AnalyticsPayload; error?: string }> {
  return withTenantContext(async () => {
    try {
      const user = await ensureIndustrialAccess();
      await connectDB();

      const attempts = await ExamAttempt.find({ tenantId: user.tenantId, userId: user.id })
        .sort({ startedAt: 1 })
        .lean();

      if (attempts.length === 0) {
        return {
          success: true,
          data: {
            totalAttempts: 0, completedAttempts: 0, averageScore: 0, avgTimePerQuestion: 0,
            timeline: [], modulePerformance: [], recentAttempts: [],
            difficultyPerformance: {
              easy: { correct: 0, total: 0, percentage: 0 },
              medium: { correct: 0, total: 0, percentage: 0 },
              hard: { correct: 0, total: 0, percentage: 0 }
            }
          }
        };
      }

      const completed = attempts.filter(a => a.status === 'completed');
      const totalScore = completed.reduce((sum, a) => sum + (a.percentage || 0), 0);
      const averageScore = completed.length > 0 ? Math.round(totalScore / completed.length) : 0;

      const moduleMap: Record<string, { answered: number; correct: number }> = {};
      const diffMap = { easy: { correct: 0, total: 0 }, medium: { correct: 0, total: 0 }, hard: { correct: 0, total: 0 } };
      let totalQuestionsCount = 0;
      let totalTimeSpent = 0;

      for (const a of attempts) {
        if (!a.questions) continue;
        for (const q of a.questions) {
          const isCorrect = q.isCorrect || false;
          totalTimeSpent += q.timeSpentSeconds || 0;
          totalQuestionsCount++;

          if (q.questionSnapshot) {
            const mod = q.questionSnapshot.module || 'GENERAL';
            if (!moduleMap[mod]) moduleMap[mod] = { answered: 0, correct: 0 };
            moduleMap[mod].answered++;
            if (isCorrect) moduleMap[mod].correct++;

            const diff = (q.questionSnapshot.difficulty || 'medium').toLowerCase() as 'easy' | 'medium' | 'hard';
            if (diffMap[diff]) {
              diffMap[diff].total++;
              if (isCorrect) diffMap[diff].correct++;
            }
          }
        }
      }

      const avgTimePerQuestion = totalQuestionsCount > 0 ? Math.round(totalTimeSpent / totalQuestionsCount) : 0;

      const modulePerformance: ModuleAnalytics[] = Object.entries(moduleMap).map(([mod, stats]) => ({
        module: mod,
        answered: stats.answered,
        correct: stats.correct,
        percentage: getPct(stats.correct, stats.answered)
      })).sort((a, b) => b.percentage - a.percentage);

      const difficultyPerformance: DifficultyAnalytics = {
        easy: { correct: diffMap.easy.correct, total: diffMap.easy.total, percentage: getPct(diffMap.easy.correct, diffMap.easy.total) },
        medium: { correct: diffMap.medium.correct, total: diffMap.medium.total, percentage: getPct(diffMap.medium.correct, diffMap.medium.total) },
        hard: { correct: diffMap.hard.correct, total: diffMap.hard.total, percentage: getPct(diffMap.hard.correct, diffMap.hard.total) }
      };

      const timeline = completed.slice(-10).map(a => ({
        startedAt: a.startedAt ? new Date(a.startedAt).toLocaleDateString() : '',
        percentage: Math.round(a.percentage || 0),
        mode: a.mode
      }));

      const recentAttempts: AttemptSummary[] = [...attempts].reverse().slice(0, 10).map(a => ({
        _id: String(a._id),
        startedAt: a.startedAt ? new Date(a.startedAt).toLocaleDateString() : '',
        percentage: Math.round(a.percentage || 0),
        score: a.score || 0,
        mode: a.mode,
        status: a.status,
        totalQuestions: a.questions ? a.questions.length : 0
      }));

      return {
        success: true,
        data: {
          totalAttempts: attempts.length,
          completedAttempts: completed.length,
          averageScore,
          avgTimePerQuestion,
          timeline,
          modulePerformance,
          difficultyPerformance,
          recentAttempts
        }
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });
}
