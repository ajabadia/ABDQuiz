/**
 * @purpose Gestiona y recupera el progreso del estudiante a nivel objetivo curricular para cada curso.
 * @purpose_en Manages and retrieves student progress at the curriculum objective level for each course.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Business Service
 * @complexity Medium
 * @fingerprint exports:4,imports:5,sig:uhgk1j
 * @lastUpdated 2026-06-24T10:54:44.539Z
 */

'use server';

import mongoose from 'mongoose';
import { getIndustrialSession } from '@ajabadia/satellite-sdk/auth-middleware';
import { connectDB, withTenantContext } from '@ajabadia/satellite-sdk/db';
import { logger } from '@ajabadia/satellite-sdk/logger';
import { resolveTargetTenantContext } from '@ajabadia/satellite-sdk/utils';
import Course from '@/models/Course';
import ExamAttempt from '@/models/ExamAttempt';
import Question from '@/models/Question';

export interface ObjectiveProgress {
  module: string;
  block: string;
  objectiveIndex: number;
  objectiveText: string;
  totalQuestions: number;
  correctCount: number;
  accuracy: number;
  status: 'mastered' | 'in_progress' | 'not_started';
}

export interface CourseProgress {
  courseId: string;
  courseName: string;
  totalObjectives: number;
  coveredObjectives: number;
  objectives: ObjectiveProgress[];
}

export interface CourseProgressResult {
  courses: CourseProgress[];
}

const MASTERY_THRESHOLD_ACCURACY = 0.8;
const MASTERY_THRESHOLD_MIN_QUESTIONS = 3;

export async function getStudentCourseProgressAction(tenantIdParam?: string) {
  const explicitCtx = await resolveTargetTenantContext(tenantIdParam);

  return withTenantContext(async () => {
    try {
      await connectDB();
      const session = await getIndustrialSession();

      if (!session?.user?.id || !session?.user?.tenantId) {
        throw new Error('Unauthorized');
      }

      const activeTenantId = explicitCtx?.tenantId || session.user.tenantId;
      const userId = session.user.id;

      const courses = await Course.find({
        tenantId: activeTenantId,
        active: true,
        objectives: { $exists: true, $not: { $size: 0 } },
      }).lean();

      if (!courses.length) {
        return { success: true, data: { courses: [] } satisfies CourseProgressResult };
      }

      const allExamConfigIds: mongoose.Types.ObjectId[] = [];
      for (const course of courses) {
        const ids = (course.learningPath || []).map(lp => lp.examConfigId).filter(Boolean);
        allExamConfigIds.push(...ids);
      }

      const attempts = await ExamAttempt.find({
        tenantId: activeTenantId,
        userId,
        examConfigId: { $in: allExamConfigIds },
        status: 'completed',
        isInvalidated: { $ne: true },
      })
        .select('questions')
        .lean();

      const attemptQMap = new Map<string, { total: number; correct: number }>();
      const involvedModules = new Set<string>();
      const involvedQIds = new Set<string>();

      for (const att of attempts) {
        const qList = (att.questions as Record<string, unknown>[] | undefined) || [];
        for (const q of qList) {
          const qs = q.questionSnapshot as Record<string, unknown> | undefined;
          const mod = qs?.module as string | undefined;
          const qId = q.questionId ? String(q.questionId) : undefined;
          if (!mod || !qId) continue;

          involvedModules.add(mod);
          involvedQIds.add(qId);

          const key = `${mod}::${qId}`;
          if (!attemptQMap.has(key)) {
            attemptQMap.set(key, { total: 0, correct: 0 });
          }
          const stats = attemptQMap.get(key)!;
          stats.total++;
          const isCorrect = q.isCorrect as boolean | undefined;
          const status = q.status as string | undefined;
          if (isCorrect || status === 'correcta') {
            stats.correct++;
          }
        }
      }

      const questions = await Question.find({
        tenantId: activeTenantId,
        module: { $in: Array.from(involvedModules) },
        _id: { $in: Array.from(involvedQIds) },
      })
        .select('module objective _id')
        .lean();

      const moduleObjectiveQuestions = new Map<string, Map<number, Set<string>>>();
      for (const q of questions) {
        const mod = q.module;
        const obj = (q.objective ?? -1);
        if (!moduleObjectiveQuestions.has(mod)) {
          moduleObjectiveQuestions.set(mod, new Map());
        }
        const objMap = moduleObjectiveQuestions.get(mod)!;
        if (!objMap.has(obj)) {
          objMap.set(obj, new Set());
        }
        objMap.get(obj)!.add(q._id.toString());
      }

      const courseProgressList: CourseProgress[] = [];

      for (const course of courses) {
        const objectives = (course.objectives as Array<{ module: string; block: string; objectives: string[] }>) || [];
        const objProgressList: ObjectiveProgress[] = [];
        let coveredCount = 0;

        for (const objBlock of objectives) {
          const mod = objBlock.module;
          const objToQIds = moduleObjectiveQuestions.get(mod);

          for (let idx = 0; idx < objBlock.objectives.length; idx++) {
            const objText = objBlock.objectives[idx];
            const questionIds = objToQIds?.get(idx) || new Set<string>();

            let totalQ = 0;
            let correctQ = 0;

            for (const qId of questionIds) {
              const key = `${mod}::${qId}`;
              const stats = attemptQMap.get(key);
              if (stats) {
                totalQ += stats.total;
                correctQ += stats.correct;
              }
            }

            const accuracy = totalQ > 0 ? Math.round((correctQ / totalQ) * 100) : 0;
            let status: 'mastered' | 'in_progress' | 'not_started';
            if (totalQ === 0) {
              status = 'not_started';
            } else if (accuracy >= MASTERY_THRESHOLD_ACCURACY * 100 && totalQ >= MASTERY_THRESHOLD_MIN_QUESTIONS) {
              status = 'mastered';
            } else {
              status = 'in_progress';
            }

            if (status === 'mastered') {
              coveredCount++;
            }

            objProgressList.push({
              module: mod,
              block: objBlock.block,
              objectiveIndex: idx,
              objectiveText: objText,
              totalQuestions: totalQ,
              correctCount: correctQ,
              accuracy,
              status,
            });
          }
        }

        const totalObj = objectives.reduce((acc, b) => acc + b.objectives.length, 0);
        courseProgressList.push({
          courseId: course._id.toString(),
          courseName: course.name,
          totalObjectives: totalObj,
          coveredObjectives: coveredCount,
          objectives: objProgressList,
        });
      }

      return {
        success: true,
        data: { courses: courseProgressList } satisfies CourseProgressResult,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      await logger.audit({
        tenantId: explicitCtx?.tenantId || 'unknown',
        action: 'FETCH_COURSE_PROGRESS_ERROR',
        entityType: 'COURSE',
        entityId: 'unknown',
        userId: 'system',
        userEmail: 'system@abd.com',
        changedFields: { error: msg },
      });
      console.error('Error fetching course progress data:', msg);
      return { success: false, error: msg };
    }
  }, explicitCtx);
}
