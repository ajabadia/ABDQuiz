import Course from '@/models/Course';
import ExamAttempt from '@/models/ExamAttempt';
import UserCourseSummary from '@/models/UserCourseSummary';
import CourseAnalytics from '@/models/CourseAnalytics';
import { LogsClient } from '@/lib/logs-client';

export class AnalyticsSyncService {
  /**
   * Performs an asynchronous, fire-and-forget sync of student and course analytics.
   * Wrapped in a background promise that will catch any errors silently and log them.
   */
  static sync(attemptId: string, tenantId: string, userId: string): void {
    // Fire and forget: run the promise without returning/awaiting it in the HTTP thread
    this.syncInternal(attemptId, tenantId, userId).catch((error) => {
      console.error('❌ [ANALYTICS_SYNC_ERROR]:', error);
      // Log to central audit trail via LogsClient (captures PII masking and is async)
      LogsClient.log({
        tenantId,
        action: 'ANALYTICS_SYNC_FAILED',
        entityType: 'SYSTEM',
        entityId: attemptId,
        userId,
        userEmail: 'system@abd.com',
        error: error instanceof Error ? error.message : String(error)
      }).catch((e) => {
        console.error('❌ [ANALYTICS_LOGS_CLIENT_ERROR]: Failed to log analytics failure:', e);
      });
    });
  }

  private static async syncInternal(attemptId: string, tenantId: string, userId: string): Promise<void> {
    const attempt = await ExamAttempt.findById(attemptId);
    if (!attempt || attempt.status !== 'completed' || attempt.isInvalidated) {
      return;
    }

    // 1. Find Course containing this ExamConfig in its learningPath
    const course = await Course.findOne({
      tenantId,
      learningPath: attempt.examConfigId
    });

    if (!course) {
      // Config not linked to any course, nothing to update in course summaries
      return;
    }

    const examConfigIds = course.learningPath;

    // 2. Fetch all completed and non-invalidated attempts by this user for the course path
    const userAttempts = await ExamAttempt.find({
      tenantId,
      userId,
      examConfigId: { $in: examConfigIds },
      status: 'completed',
      isInvalidated: { $ne: true }
    });

    // Calculate completed assignments (unique examConfigIds completed)
    const completedConfigs = new Set<string>();
    for (const att of userAttempts) {
      completedConfigs.add(att.examConfigId.toString());
    }

    const completedAssignments = completedConfigs.size;
    const totalAssignments = examConfigIds.length;

    // Calculate average grade and time spent
    let totalGradeSum = 0;
    let totalSeconds = 0;
    const moduleCorrect: Record<string, { correct: number; total: number }> = {};
    let lastAttemptAt = attempt.endedAt || new Date();

    for (const att of userAttempts) {
      totalGradeSum += att.percentage || 0;
      if (att.endedAt && att.endedAt > lastAttemptAt) {
        lastAttemptAt = att.endedAt;
      }

      if (att.questions) {
        for (const q of att.questions) {
          totalSeconds += q.timeSpentSeconds || 0;
          if (q.questionSnapshot) {
            const mod = q.questionSnapshot.module || 'General';
            if (!moduleCorrect[mod]) {
              moduleCorrect[mod] = { correct: 0, total: 0 };
            }
            moduleCorrect[mod].total++;
            if (q.status === 'correcta') {
              moduleCorrect[mod].correct++;
            }
          }
        }
      }
    }

    const averageGrade = userAttempts.length > 0 ? totalGradeSum / userAttempts.length : 0;
    const status = (completedAssignments >= totalAssignments && totalAssignments > 0) ? 'completed' : 'in_progress';

    // Identify weak modules (< 70% correct and at least 3 questions evaluated to ensure statistical relevance)
    const weakModules: string[] = [];
    for (const [mod, stats] of Object.entries(moduleCorrect)) {
      if (stats.total >= 3) {
        const rate = stats.correct / stats.total;
        if (rate < 0.7) {
          weakModules.push(mod);
        }
      }
    }

    // 3. Upsert UserCourseSummary
    const userSummary = await UserCourseSummary.findOneAndUpdate(
      { tenantId, userId, courseId: course._id },
      {
        courseName: course.name,
        completedAssignments,
        totalAssignments,
        averageGrade: Math.round(averageGrade),
        timeSpentSeconds: totalSeconds,
        lastAttemptAt,
        status,
        weakModules
      },
      { upsert: true, new: true }
    );

    // 4. Update CourseAnalytics
    const summaries = await UserCourseSummary.find({ tenantId, courseId: course._id });
    const totalStudentsEnrolled = summaries.length;
    const completedStudents = summaries.filter(s => s.status === 'completed').length;
    const completionRate = totalStudentsEnrolled > 0 ? Math.round((completedStudents / totalStudentsEnrolled) * 100) : 0;

    const courseAvgGradeSum = summaries.reduce((sum, s) => sum + s.averageGrade, 0);
    const courseAverageGrade = totalStudentsEnrolled > 0 ? courseAvgGradeSum / totalStudentsEnrolled : 0;

    const gradeDistribution = { fail: 0, pass: 0, remarkable: 0, outstanding: 0 };
    for (const s of summaries) {
      if (s.averageGrade < 50) gradeDistribution.fail++;
      else if (s.averageGrade < 70) gradeDistribution.pass++;
      else if (s.averageGrade < 90) gradeDistribution.remarkable++;
      else gradeDistribution.outstanding++;
    }

    // Temporal learning curve
    const courseAttempts = await ExamAttempt.find({
      tenantId,
      examConfigId: { $in: examConfigIds },
      status: 'completed',
      isInvalidated: { $ne: true }
    }).sort({ endedAt: 1 });

    const curveMap: Record<string, { sum: number; count: number }> = {};
    for (const att of courseAttempts) {
      if (att.endedAt) {
        const dateStr = att.endedAt.toISOString().split('T')[0];
        if (!curveMap[dateStr]) {
          curveMap[dateStr] = { sum: 0, count: 0 };
        }
        curveMap[dateStr].sum += att.percentage || 0;
        curveMap[dateStr].count++;
      }
    }

    const learningCurve = Object.entries(curveMap).map(([date, stats]) => ({
      date,
      averageGrade: Math.round(stats.sum / stats.count)
    }));

    // Distractor Telemetry
    const telemetryMap: Record<string, {
      questionText: string;
      attempts: number;
      incorrect: number;
      options: Record<number, number>;
    }> = {};

    for (const att of courseAttempts) {
      if (att.questions) {
        for (const q of att.questions) {
          const qId = q.questionId.toString();
          if (!telemetryMap[qId]) {
            telemetryMap[qId] = {
              questionText: q.questionSnapshot?.questionText || '',
              attempts: 0,
              incorrect: 0,
              options: {}
            };
          }
          const item = telemetryMap[qId];
          item.attempts++;
          if (q.status !== 'correcta') {
            item.incorrect++;
          }
          if (q.selectedOptionIndex !== null && q.selectedOptionIndex !== undefined) {
            item.options[q.selectedOptionIndex] = (item.options[q.selectedOptionIndex] || 0) + 1;
          }
        }
      }
    }

    const distractorTelemetry = Object.entries(telemetryMap).map(([qId, item]) => {
      const optionsFrequency = Object.entries(item.options).map(([idx, count]) => ({
        optionIndex: parseInt(idx),
        frequency: Math.round((count / item.attempts) * 100)
      }));

      return {
        questionId: qId,
        questionText: item.questionText,
        totalAttempts: item.attempts,
        incorrectRate: Math.round((item.incorrect / item.attempts) * 100),
        optionsFrequency
      };
    });

    await CourseAnalytics.findOneAndUpdate(
      { tenantId, courseId: course._id },
      {
        totalStudentsEnrolled,
        completionRate,
        averageGrade: Math.round(courseAverageGrade),
        gradeDistribution,
        learningCurve,
        distractorTelemetry
      },
      { upsert: true }
    );
  }
}
