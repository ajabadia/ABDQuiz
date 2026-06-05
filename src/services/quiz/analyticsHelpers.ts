import ExamAttempt from '@/models/ExamAttempt';
import UserCourseSummary from '@/models/UserCourseSummary';
import Course from '@/models/Course';

export async function getCourseByExamConfig(tenantId: string, examConfigId: string) {
  return Course.findOne({
    tenantId,
    'learningPath.examConfigId': examConfigId,
  });
}

export async function getUserAttemptsForCourse(tenantId: string, userId: string, examConfigIds: string[]) {
  return ExamAttempt.find({
    tenantId,
    userId,
    examConfigId: { $in: examConfigIds },
    status: 'completed',
    isInvalidated: { $ne: true },
  });
}

export function calculateModuleCorrectMap(attempts: Array<{
  percentage?: number;
  endedAt?: Date | string;
  questions?: Array<{
    timeSpentSeconds?: number;
    questionSnapshot?: { module?: string };
    status?: string;
    selectedOptionIndex?: number | null;
  }>;
}>): {
  totalGradeSum: number;
  totalSeconds: number;
  lastAttemptAt: Date;
  moduleCorrect: Record<string, { correct: number; total: number }>;
} {
  let totalGradeSum = 0;
  let totalSeconds = 0;
  let lastAttemptAt = new Date(0);
  const moduleCorrect: Record<string, { correct: number; total: number }> = {};

  for (const att of attempts) {
    totalGradeSum += att.percentage || 0;
    if (att.endedAt && new Date(att.endedAt) > lastAttemptAt) {
      lastAttemptAt = new Date(att.endedAt);
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

  return { totalGradeSum, totalSeconds, lastAttemptAt, moduleCorrect };
}

export function identifyWeakModules(moduleCorrect: Record<string, { correct: number; total: number }>): string[] {
  const weakModules: string[] = [];
  for (const [mod, stats] of Object.entries(moduleCorrect)) {
    if (stats.total >= 3) {
      const rate = stats.correct / stats.total;
      if (rate < 0.7) {
        weakModules.push(mod);
      }
    }
  }
  return weakModules;
}

export async function getCourseAnalyticsData(tenantId: string, courseId: string) {
  const summaries = await UserCourseSummary.find({ tenantId, courseId });
  return summaries;
}

export function computeGradeDistribution(summaries: Array<{ averageGrade: number }>) {
  const gradeDistribution = { fail: 0, pass: 0, remarkable: 0, outstanding: 0 };
  for (const s of summaries) {
    if (s.averageGrade < 50) gradeDistribution.fail++;
    else if (s.averageGrade < 70) gradeDistribution.pass++;
    else if (s.averageGrade < 90) gradeDistribution.remarkable++;
    else gradeDistribution.outstanding++;
  }
  return gradeDistribution;
}

export function buildLearningCurve(courseAttempts: Array<{ endedAt?: Date; percentage?: number }>): Array<{ date: string; averageGrade: number }> {
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
  return Object.entries(curveMap).map(([date, stats]) => ({
    date,
    averageGrade: Math.round(stats.sum / stats.count),
  }));
}

export function buildDistractorTelemetry(courseAttempts: Array<{ questions?: Array<{ questionId: { toString(): string }; questionSnapshot?: { questionText?: string }; status?: string; selectedOptionIndex?: number | null }> }>) {
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
            options: {},
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

  return Object.entries(telemetryMap).map(([qId, item]) => {
    const optionsFrequency = Object.entries(item.options).map(([idx, count]) => ({
      optionIndex: parseInt(idx),
      frequency: Math.round((count / item.attempts) * 100),
    }));
    return {
      questionId: qId,
      questionText: item.questionText,
      totalAttempts: item.attempts,
      incorrectRate: Math.round((item.incorrect / item.attempts) * 100),
      optionsFrequency,
    };
  });
}
