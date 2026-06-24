/**
 * @purpose Gestiona el recuperar y agrupar datos para la consola del estudiante, incluyendo exámenes disponibles, intentos recientes, total intentos, intentos completados y puntuación media.
 * @purpose_en Manages the retrieval and aggregation of data for the student's dashboard, including available exams, recent attempts, total attempts, completed attempts, and average score.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Business Service
 * @complexity Medium
 * @fingerprint exports:3,imports:5,sig:1nbm30t
 * @lastUpdated 2026-06-24T10:32:04.911Z
 */

'use server';

import { connectDB, getIndustrialSession, logger, withTenantContext, resolveTargetTenantContext } from '@ajabadia/satellite-sdk';
import ExamAttempt from '@/models/ExamAttempt';
import ExamAssignment from '@/models/ExamAssignment';
import ExamConfig from '@/models/ExamConfig';
import { type SerializedExamConfig } from '@/types/quiz';

// --- Tipos serializados ---

export interface DashboardAttemptSummary {
  _id: string;
  examName: string;
  startedAt: string;
  percentage: number;
  score: number;
  mode: 'training' | 'mock';
  status: 'in_progress' | 'completed' | 'timeout';
  totalQuestions: number;
}

export interface DashboardData {
  availableExams: SerializedExamConfig[];
  recentAttempts: DashboardAttemptSummary[];
  totalAttempts: number;
  completedAttempts: number;
  averageScore: number;
}

/**
 * Obtiene los datos agregados para el dashboard del estudiante:
 * - Exámenes disponibles (asignaciones publicadas y vigentes)
 * - Últimos 5 intentos del usuario
 * - KPIs: total de intentos, completados, nota media
 */
export async function getStudentDashboardAction(tenantIdParam?: string) {
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
      const now = new Date();

      // 1. Exámenes disponibles (asignaciones publicadas y vigentes)
      const assignments = await ExamAssignment.find({
        tenantId: activeTenantId,
        status: 'published',
        active: true,
        startDate: { $lte: now },
        endDate: { $gte: now },
      })
        .populate('examConfigId')
        .lean();

      const configMap = new Map<string, SerializedExamConfig>();
      for (const a of assignments) {
        const config = a.examConfigId as unknown as Record<string, unknown>;
        if (config && config._id) {
          const id = (config._id as { toString(): string }).toString();
          if (!configMap.has(id) && config.active === true) {
            configMap.set(id, {
              ...config,
              _id: id,
              createdAt: (config.createdAt as Date | undefined)?.toISOString() || '',
              updatedAt: (config.updatedAt as Date | undefined)?.toISOString() || '',
            } as unknown as SerializedExamConfig);
          }
        }
      }

      const availableExams = Array.from(configMap.values());

      // 2. Intentos recientes del usuario (últimos 5)
      const attempts = await ExamAttempt.find({
        tenantId: activeTenantId,
        userId,
      })
        .sort({ startedAt: -1 })
        .limit(5)
        .populate('examConfigId', 'name')
        .lean();

      const recentAttempts: DashboardAttemptSummary[] = (attempts as unknown as Record<string, unknown>[]).map((a) => ({
        _id: (a._id as { toString(): string }).toString(),
        examName: (a.examConfigId as Record<string, unknown> | undefined)?.name as string || '—',
        startedAt: (a.startedAt as Date)?.toISOString() || '',
        percentage: Math.round((a.percentage as number) || 0),
        score: (a.score as number) || 0,
        mode: (a.mode as 'training' | 'mock'),
        status: (a.status as 'in_progress' | 'completed' | 'timeout'),
        totalQuestions: Array.isArray(a.questions) ? (a.questions as unknown[]).length : 0,
      }));

      // 3. KPIs
      const totalAttempts = await ExamAttempt.countDocuments({
        tenantId: activeTenantId,
        userId,
      });

      const completedAttempts = await ExamAttempt.countDocuments({
        tenantId: activeTenantId,
        userId,
        status: 'completed',
      });

      // Average score from all completed attempts
      const completedDocs = await ExamAttempt.find({
        tenantId: activeTenantId,
        userId,
        status: 'completed',
      })
        .select('percentage')
        .lean();

      const averageScore = completedDocs.length > 0
        ? Math.round(completedDocs.reduce((sum, d) => sum + ((d.percentage as number) || 0), 0) / completedDocs.length)
        : 0;

      return {
        success: true,
        data: {
          availableExams,
          recentAttempts,
          totalAttempts,
          completedAttempts,
          averageScore,
        } satisfies DashboardData,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      await logger.audit({
        tenantId: explicitCtx?.tenantId || 'unknown',
        action: 'FETCH_STUDENT_DASHBOARD_ERROR',
        entityType: 'EXAM',
        entityId: 'unknown',
        userId: 'system',
        userEmail: 'system@abd.com',
        changedFields: { error: msg },
      });
      console.error('❌ Error fetching student dashboard data:', msg);
      return { success: false, error: msg };
    }
  }, explicitCtx);
}
