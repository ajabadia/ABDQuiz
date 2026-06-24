/**
 * @purpose Gestiona el análisis de la cobertura objetiva de los exámenes frente a una curricula oficial para profesores.
 * @purpose_en Manages the analysis of exam objective coverage against an official curriculum for teachers.
 * @refactorable false
 * @classification Business Service
 * @complexity Medium
 * @fingerprint exports:3,imports:3,sig:18ff9n
 * @lastUpdated 2026-06-24T08:21:02.345Z
 */

import Question from '../../models/Question';
import ExamConfig from '../../models/ExamConfig';
import Course from '../../models/Course';

export interface ObjectiveCoverageAuditResult {
  module: string;
  block: string;
  objectiveIndex: number;
  objectiveText: string;
  questionCount: number;
  status: 'sufficient' | 'scarce' | 'missing';
}

export interface ExamAuditReport {
  examName: string;
  totalObjectives: number;
  coveredObjectives: number;
  coveragePercentage: number;
  details: ObjectiveCoverageAuditResult[];
  unclassifiedQuestionsCount: number;
}

export class ExamAuditorService {
  /**
   * Localiza el curso vinculado a una configuración de examen.
   * Busca primero por ExamConfig.courseId (relación directa),
   * luego por Course.learningPath (relación inversa).
   */
  static async findCourseForExamConfig(tenantId: string, examConfigId: string) {
    const config = await ExamConfig.findOne({ _id: examConfigId, tenantId });
    if (!config) return null;

    if (config.courseId) {
      const course = await Course.findOne({ _id: config.courseId, tenantId, active: true });
      if (course) return course;
    }

    return await Course.findOne({
      tenantId,
      active: true,
      'learningPath.examConfigId': examConfigId
    });
  }

  /**
   * Realiza la auditoría de cobertura por objetivos sobre un examen oficial configurado.
   * Lee los objetivos desde el curso vinculado (sin fallback a datos hardcodeados).
   * Retorna null si no hay curso o si el curso no tiene objetivos definidos.
   */
  static async auditExamCoverage(tenantId: string, examConfigId: string): Promise<ExamAuditReport | null> {
    const config = await ExamConfig.findOne({ _id: examConfigId, tenantId });
    if (!config) return null;

    const course = await this.findCourseForExamConfig(tenantId, examConfigId);
    if (!course || !course.objectives || course.objectives.length === 0) return null;

    const query: any = {
      tenantId,
      active: true
    };

    if (config.moduleFilter && config.moduleFilter.length > 0) {
      query.module = { $in: config.moduleFilter };
    }

    const questions = await Question.find(query)
      .select('module questionText objective tags')
      .lean();

    const details: ObjectiveCoverageAuditResult[] = [];
    let totalObjectivesCount = 0;
    let coveredObjectivesCount = 0;
    let unclassifiedQuestionsCount = 0;

    for (const entry of course.objectives) {
      const blockObjectives = entry.objectives || [];
      
      blockObjectives.forEach((objText, idx) => {
        totalObjectivesCount++;
        const objIndex = idx + 1;

        const count = questions.filter(q => {
          const isObjMatch = q.module === entry.module && q.objective === objIndex;
          const hasBlockTag = q.tags && q.tags.length > 0
            ? q.tags.includes(`${entry.module}-${entry.block}`)
            : true;
          return isObjMatch && hasBlockTag;
        }).length;

        let status: 'sufficient' | 'scarce' | 'missing' = 'missing';
        if (count >= 5) {
          status = 'sufficient';
        } else if (count > 0) {
          status = 'scarce';
        }

        if (count > 0) {
          coveredObjectivesCount++;
        }

        details.push({
          module: entry.module,
          block: entry.block,
          objectiveIndex: objIndex,
          objectiveText: objText,
          questionCount: count,
          status
        });
      });
    }

    unclassifiedQuestionsCount = questions.filter(q => q.objective === undefined || q.objective === null).length;

    const coveragePercentage = totalObjectivesCount > 0 
      ? Math.round((coveredObjectivesCount / totalObjectivesCount) * 100) 
      : 0;

    return {
      examName: config.name,
      totalObjectives: totalObjectivesCount,
      coveredObjectives: coveredObjectivesCount,
      coveragePercentage,
      details,
      unclassifiedQuestionsCount
    };
  }
}
