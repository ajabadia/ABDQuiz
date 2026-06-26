/**
 * @purpose Gestiona el recuperar y actualizar los objetivos del curso para un curso determinado en el proyecto ABDSuite.
 * @purpose_en Manages the retrieval and updating of course objectives for a given course in the ABDSuite project.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Business Service
 * @complexity Medium
 * @fingerprint exports:2,imports:6,sig:15ro49w
 * @lastUpdated 2026-06-26T10:00:54.765Z
 */

'use server';

import { getIndustrialSession } from '@ajabadia/satellite-sdk/auth-middleware';
import { connectDB, withTenantContext } from '@ajabadia/satellite-sdk/db';
import { logger } from '@ajabadia/satellite-sdk/logger';
import { resolveTargetTenantContext } from '@ajabadia/satellite-sdk/utils';
import Course, { type ICourseObjective } from '@/models/Course';
import { revalidatePath } from 'next/cache';

export async function getCourseObjectivesAction(courseId: string, tenantIdParam?: string) {
  const explicitCtx = await resolveTargetTenantContext(tenantIdParam);

  return withTenantContext(async () => {
    try {
      await connectDB();
      const session = await getIndustrialSession();
      if (!session?.user?.id) throw new Error('Unauthorized');

      const course = await Course.findById(courseId).select('objectives').lean();
      if (!course) throw new Error('Curso no encontrado');

      return (course.objectives as ICourseObjective[]) || [];
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      await logger.audit({
        tenantId: explicitCtx?.tenantId || 'unknown',
        action: 'GET_COURSE_OBJECTIVES_ERROR',
        entityType: 'COURSE',
        entityId: courseId,
        userId: 'system',
        userEmail: 'system@abd.com',
        changedFields: { error: msg },
      });
      console.error('Error getting course objectives:', msg);
      return [];
    }
  }, explicitCtx);
}

export async function setCourseObjectivesAction(
  courseId: string,
  objectives: ICourseObjective[],
  tenantIdParam?: string
) {
  const explicitCtx = await resolveTargetTenantContext(tenantIdParam);

  return withTenantContext(async () => {
    try {
      await connectDB();
      const session = await getIndustrialSession();
      if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

      const course = await Course.findById(courseId);
      if (!course) return { success: false, error: 'Curso no encontrado' };

      const activeTenantId = explicitCtx?.tenantId || session.user.tenantId;
      if (course.tenantId !== activeTenantId && session.user.role !== 'SUPER_ADMIN') {
        return { success: false, error: 'Acceso no autorizado' };
      }

      course.objectives = objectives;
      await course.save();

      await logger.audit({
        tenantId: course.tenantId,
        action: 'QUIZ_COURSE_OBJECTIVES_UPDATED',
        entityType: 'COURSE',
        entityId: courseId,
        userId: session.user.id,
        userEmail: session.user.email || 'system@abd.com',
        changedFields: { objectivesCount: objectives.length },
      });

      revalidatePath(`/admin/courses/${courseId}`);
      return { success: true };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      await logger.audit({
        tenantId: explicitCtx?.tenantId || 'unknown',
        action: 'SET_COURSE_OBJECTIVES_ERROR',
        entityType: 'COURSE',
        entityId: courseId,
        userId: 'system',
        userEmail: 'system@abd.com',
        changedFields: { error: msg },
      });
      console.error('Error setting course objectives:', msg);
      return { success: false, error: msg };
    }
  }, explicitCtx);
}
