/**
 * @purpose Gestiona la sincronización de análisis de quiz mediante el procesamiento de intentos de examen, la cálculo del progreso del usuario y la actualización de análisis de curso.
 * @purpose_en Manages the synchronization of quiz analytics by processing exam attempts, calculating user progress, and updating course analytics.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Business Service
 * @complexity Medium
 * @fingerprint exports:1,imports:6,sig:1uxldoz
 * @lastUpdated 2026-06-23T19:53:27.397Z
 */

import Course from '@/models/Course';
import ExamAttempt from '@/models/ExamAttempt';
import UserCourseSummary, { IUserCourseSummary } from '@/models/UserCourseSummary';
import CourseAnalytics from '@/models/CourseAnalytics';
import { logger } from '@ajabadia/satellite-sdk';
import {
  getCourseByExamConfig,
  getUserAttemptsForCourse,
  calculateModuleCorrectMap,
  identifyWeakModules,
  getCourseAnalyticsData,
  computeGradeDistribution,
  buildLearningCurve,
  buildDistractorTelemetry,
} from './analyticsHelpers';

export class AnalyticsSyncService {
  static sync(attemptId: string, tenantId: string, userId: string): void {
    this.syncInternal(attemptId, tenantId, userId).catch((error) => {
      console.error('❌ [ANALYTICS_SYNC_ERROR]:', error);
      logger.audit({
        tenantId,
        action: 'ANALYTICS_SYNC_FAILED',
        entityType: 'SYSTEM',
        entityId: attemptId,
        userId,
        userEmail: 'system@abd.com',
        error: error instanceof Error ? error.message : String(error),
      }).catch((e) => {
        console.error('❌ [ANALYTICS_LOGS_CLIENT_ERROR]: Failed to log analytics failure:', e);
      });
    });
  }

  private static async syncInternal(attemptId: string, tenantId: string, userId: string): Promise<void> {
    const attempt = await ExamAttempt.findById(attemptId);
    if (!attempt || attempt.status !== 'completed' || attempt.isInvalidated) return;

    const examConfigIdStr = attempt.examConfigId?.toString();
    if (!examConfigIdStr) return;
    const course = await getCourseByExamConfig(tenantId, examConfigIdStr);
    if (!course) return;

    const examConfigIds = course.learningPath.map((item) => item.examConfigId.toString());
    const userAttempts = await getUserAttemptsForCourse(tenantId, userId, examConfigIds);

    // Calculate completed assignments
    const completedConfigs = new Set<string>();
    for (const att of userAttempts) {
      if (att.examConfigId) completedConfigs.add(att.examConfigId.toString());
    }
    const completedAssignments = completedConfigs.size;
    const totalAssignments = examConfigIds.length;

    // Calculate grades, time, and module stats
    const { totalGradeSum, totalSeconds, lastAttemptAt, moduleCorrect } = calculateModuleCorrectMap(userAttempts);
    const averageGrade = userAttempts.length > 0 ? totalGradeSum / userAttempts.length : 0;
    const status = (completedAssignments >= totalAssignments && totalAssignments > 0) ? 'completed' : 'in_progress';
    const weakModules = identifyWeakModules(moduleCorrect);

    // Upsert UserCourseSummary
    await UserCourseSummary.findOneAndUpdate(
      { tenantId, userId, courseId: course._id },
      {
        courseName: course.name,
        completedAssignments,
        totalAssignments,
        averageGrade: Math.round(averageGrade),
        timeSpentSeconds: totalSeconds,
        lastAttemptAt,
        status,
        weakModules,
      },
      { upsert: true, new: true }
    );

    // Update CourseAnalytics
    const summaries = await getCourseAnalyticsData(tenantId, course._id.toString());
    const totalStudentsEnrolled = summaries.length;
    const completedStudents = (summaries as unknown as IUserCourseSummary[]).filter((s) => s.status === 'completed').length;
    const completionRate = totalStudentsEnrolled > 0 ? Math.round((completedStudents / totalStudentsEnrolled) * 100) : 0;

    const courseAvgGradeSum = (summaries as unknown as IUserCourseSummary[]).reduce((sum: number, s) => sum + s.averageGrade, 0);
    const courseAverageGrade = totalStudentsEnrolled > 0 ? courseAvgGradeSum / totalStudentsEnrolled : 0;
    const gradeDistribution = computeGradeDistribution(summaries);

    const courseAttempts = await ExamAttempt.find({
      tenantId,
      examConfigId: { $in: examConfigIds },
      status: 'completed',
      isInvalidated: { $ne: true },
    }).sort({ endedAt: 1 });

    const learningCurve = buildLearningCurve(courseAttempts);
    const distractorTelemetry = buildDistractorTelemetry(courseAttempts);

    await CourseAnalytics.findOneAndUpdate(
      { tenantId, courseId: course._id },
      {
        totalStudentsEnrolled,
        completionRate,
        averageGrade: Math.round(courseAverageGrade),
        gradeDistribution,
        learningCurve,
        distractorTelemetry,
      },
      { upsert: true }
    );
  }
}
