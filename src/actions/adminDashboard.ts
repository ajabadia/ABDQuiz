/**
 * @purpose Proporciona indicadores clave de rendimiento (KPIs) para el panel administrativo, incluyendo conteo de estudiantes, estadísticas de exámenes, estado de cursos y datos financieros.
 * @purpose_en Calculates and returns key performance indicators (KPIs) for the admin dashboard, including student count, exam statistics, course status, and financial data.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Business Service
 * @complexity Medium
 * @fingerprint exports:2,imports:7,sig:15mhz8w
 * @lastUpdated 2026-06-25T09:18:25.182Z
 */

'use server';

import { getIndustrialSession } from '@ajabadia/satellite-sdk/auth-middleware';
import { connectDB, withTenantContext } from '@ajabadia/satellite-sdk/db';
import { logger } from '@ajabadia/satellite-sdk/logger';
import { resolveTargetTenantContext } from '@ajabadia/satellite-sdk/utils';
import ExamAttempt from '@/models/ExamAttempt';
import Course from '@/models/Course';
import Invoice from '@/models/Invoice';

export interface DashboardKPIs {
  totalStudents: number;
  totalExams: number;
  activeCourses: number;
  examsPerMonth: { year: number; month: number; count: number }[];
  storageUsedMB: number;
  storageQuotaMB: number;
  pendingInvoices: number;
  overdueInvoices: number;
  lastInvoiceAmount: number;
}

export async function getDashboardKPIsAction(tenantIdParam?: string): Promise<DashboardKPIs> {
  const explicitCtx = await resolveTargetTenantContext(tenantIdParam);

  return withTenantContext(async () => {
    try {
      await connectDB();
      const session = await getIndustrialSession();

      if (!session?.user?.id || !session?.user?.tenantId) {
        throw new Error('Unauthorized');
      }

      const activeTenantId = explicitCtx?.tenantId || session.user.tenantId;

      const [
        studentsResult,
        examsResult,
        activeCoursesCount,
        examsByMonth,
        pendingInvoices,
        overdueInvoices,
        lastInvoice
      ] = await Promise.all([
        ExamAttempt.distinct('userId', { tenantId: activeTenantId }),
        ExamAttempt.countDocuments({ tenantId: activeTenantId }),
        Course.countDocuments({ tenantId: activeTenantId, active: true }),
        ExamAttempt.aggregate([
          { $match: { tenantId: activeTenantId, endedAt: { $exists: true } } },
          { $group: {
            _id: { year: { $year: '$endedAt' }, month: { $month: '$endedAt' } },
            count: { $sum: 1 }
          }},
          { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]),
        Invoice.countDocuments({ tenantId: activeTenantId, status: 'pending' }),
        Invoice.countDocuments({ tenantId: activeTenantId, status: 'overdue' }),
        Invoice.findOne({ tenantId: activeTenantId }).sort({ issuedAt: -1 }).select('totalAmount').lean(),
      ]);

      await logger.audit({
        tenantId: activeTenantId,
        action: 'DASHBOARD_KPIS_VIEWED',
        entityType: 'DASHBOARD',
        entityId: activeTenantId,
        userId: session.user.id,
        userEmail: session.user.email || 'system@abd.com',
        changedFields: { totalStudents: studentsResult.length, totalExams: examsResult },
      });

      return {
        totalStudents: studentsResult.length,
        totalExams: examsResult,
        activeCourses: activeCoursesCount,
        examsPerMonth: examsByMonth.map((e: { _id: { year: number; month: number }; count: number }) => ({
          year: e._id.year,
          month: e._id.month,
          count: e.count,
        })),
        storageUsedMB: 0,
        storageQuotaMB: 1024,
        pendingInvoices,
        overdueInvoices,
        lastInvoiceAmount: lastInvoice?.totalAmount || 0,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error fetching dashboard KPIs:', msg);
      throw new Error(msg);
    }
  }, explicitCtx);
}
