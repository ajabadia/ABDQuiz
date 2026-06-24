/**
 * @purpose Gestiona acciones relacionadas con los cursos, como listar, crear, actualizar y eliminar cursos dentro de un inquilino.
 * @purpose_en Manages course-related actions such as listing, creating, updating, and deleting courses within a tenant.
 * @refactorable true (contains multiple business logic functions)
 * @classification Business Service
 * @complexity Medium
 * @fingerprint exports:6,imports:4,sig:1q94pr0
 * @lastUpdated 2026-06-23T23:07:11.325Z
 */

'use server';

import { connectDB, getIndustrialSession, logger, withTenantContext, resolveTargetTenantContext } from '@ajabadia/satellite-sdk';
import Course from '@/models/Course';
import { revalidatePath } from 'next/cache';

// --- Tipos serializados ---

import { serializeCourse, type SerializedCourse, findCourseOrThrow } from './courseHelpers';

export type { SerializedCourse };

// --- List ---

/**
 * Lista todos los cursos activos del tenant, con opción de filtrar por espacio.
 */
export async function listCoursesAction(spaceId?: string, tenantIdParam?: string) {
  const explicitCtx = await resolveTargetTenantContext(tenantIdParam);

  return withTenantContext(async () => {
    try {
      await connectDB();
      const session = await getIndustrialSession();

      if (!session?.user?.id || !session?.user?.tenantId) {
        throw new Error('Unauthorized');
      }

      const activeTenantId = explicitCtx?.tenantId || session.user.tenantId;

      const query: Record<string, unknown> = { tenantId: activeTenantId, active: true };
      if (spaceId) query.spaceId = spaceId;

      const docs = await Course.find(query)
        .sort({ createdAt: -1 })
        .lean();

      return docs.map((d) => serializeCourse(d as unknown as Record<string, unknown>));
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error listing courses:', msg);
      throw new Error(msg);
    }
  }, explicitCtx);
}

// --- Create ---

export async function createCourseAction(
  data: {
    spaceId: string;
    name: string;
    description?: string;
    tags?: string[];
  },
  tenantIdParam?: string
) {
  const explicitCtx = await resolveTargetTenantContext(tenantIdParam);

  return withTenantContext(async () => {
    try {
      await connectDB();
      const session = await getIndustrialSession();

      if (!session?.user?.id || !session?.user?.tenantId) {
        return { success: false, error: 'Unauthorized' };
      }

      const activeTenantId = explicitCtx?.tenantId || session.user.tenantId;

      // Validar nombre obligatorio
      if (!data.name || data.name.trim() === '') {
        return { success: false, error: 'El nombre del curso es obligatorio' };
      }

      const newCourse = await Course.create({
        tenantId: activeTenantId,
        spaceId: data.spaceId,
        name: data.name.trim(),
        description: data.description?.trim(),
        tags: data.tags || [],
        learningPath: [],
        active: true,
        createdBy: session.user.id,
      });

      await logger.audit({
        tenantId: activeTenantId,
        action: 'QUIZ_COURSE_CREATED',
        entityType: 'COURSE',
        entityId: newCourse._id.toString(),
        userId: session.user.id,
        userEmail: session.user.email || 'system@abd.com',
        changedFields: { ...data, tenantId: activeTenantId },
      });

      revalidatePath('/admin/courses');
      return { success: true, id: newCourse._id.toString() };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error creating course:', msg);
      return { success: false, error: msg };
    }
  }, explicitCtx);
}

// --- Update ---

export async function updateCourseAction(
  id: string,
  data: {
    spaceId?: string;
    name?: string;
    description?: string;
    tags?: string[];
  },
  tenantIdParam?: string
) {
  const explicitCtx = await resolveTargetTenantContext(tenantIdParam);

  return withTenantContext(async () => {
    try {
      await connectDB();
      const session = await getIndustrialSession();

      if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

      const course = await Course.findById(id);
      if (!course) {
        return { success: false, error: 'Curso no encontrado' };
      }

      const activeTenantId = explicitCtx?.tenantId || session.user.tenantId;
      if (course.tenantId !== activeTenantId && session.user.role !== 'SUPER_ADMIN') {
        return { success: false, error: 'Acceso no autorizado' };
      }

      const updateData: Record<string, unknown> = {};
      if (data.spaceId) updateData.spaceId = data.spaceId;
      if (data.name !== undefined) {
        if (data.name.trim() === '') {
          return { success: false, error: 'El nombre del curso no puede estar vacío' };
        }
        updateData.name = data.name.trim();
      }
      if (data.description !== undefined) updateData.description = data.description.trim();
      if (data.tags !== undefined) updateData.tags = data.tags;

      const previousState = course.toObject() as unknown as Record<string, unknown>;
      await Course.findByIdAndUpdate(id, { $set: updateData });

      await logger.audit({
        tenantId: course.tenantId,
        action: 'QUIZ_COURSE_UPDATED',
        entityType: 'COURSE',
        entityId: id,
        userId: session.user.id,
        userEmail: session.user.email || 'system@abd.com',
        changedFields: updateData,
        previousState,
      });

      revalidatePath('/admin/courses');
      return { success: true };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error updating course:', msg);
      return { success: false, error: msg };
    }
  }, explicitCtx);
}

// --- Toggle Active ---

export async function toggleCourseActiveAction(id: string, tenantIdParam?: string) {
  const explicitCtx = await resolveTargetTenantContext(tenantIdParam);

  return withTenantContext(async () => {
    try {
      await connectDB();
      const session = await getIndustrialSession();

      if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

      const course = await Course.findById(id);
      if (!course) {
        return { success: false, error: 'Curso no encontrado' };
      }

      const activeTenantId = explicitCtx?.tenantId || session.user.tenantId;
      if (course.tenantId !== activeTenantId && session.user.role !== 'SUPER_ADMIN') {
        return { success: false, error: 'Acceso no autorizado' };
      }

      const newActive = !course.active;
      const previousState = course.toObject() as unknown as Record<string, unknown>;
      await Course.findByIdAndUpdate(id, { $set: { active: newActive } });

      await logger.audit({
        tenantId: course.tenantId,
        action: 'QUIZ_COURSE_UPDATED',
        entityType: 'COURSE',
        entityId: id,
        userId: session.user.id,
        userEmail: session.user.email || 'system@abd.com',
        changedFields: { active: newActive },
        previousState,
      });

      revalidatePath('/admin/courses');
      return { success: true, active: newActive };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error toggling course:', msg);
      return { success: false, error: msg };
    }
  }, explicitCtx);
}

// --- Delete (soft) ---

export async function deleteCourseAction(id: string, tenantIdParam?: string) {
  const explicitCtx = await resolveTargetTenantContext(tenantIdParam);

  return withTenantContext(async () => {
    try {
      await connectDB();
      const session = await getIndustrialSession();

      if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

      const course = await Course.findById(id);
      if (!course) {
        return { success: false, error: 'Curso no encontrado' };
      }

      const activeTenantId = explicitCtx?.tenantId || session.user.tenantId;
      if (course.tenantId !== activeTenantId && session.user.role !== 'SUPER_ADMIN') {
        return { success: false, error: 'Acceso no autorizado' };
      }

      const previousState = course.toObject() as unknown as Record<string, unknown>;
      await Course.findByIdAndUpdate(id, { $set: { active: false } });

      await logger.audit({
        tenantId: course.tenantId,
        action: 'QUIZ_COURSE_DELETED',
        entityType: 'COURSE',
        entityId: id,
        userId: session.user.id,
        userEmail: session.user.email || 'system@abd.com',
        changedFields: { active: false },
        previousState,
      });

      revalidatePath('/admin/courses');
      return { success: true };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error deleting course:', msg);
      return { success: false, error: msg };
    }
  }, explicitCtx);
}
