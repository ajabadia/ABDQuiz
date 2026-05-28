'use server';

import { connectDB } from '@ajabadia/satellite-sdk';
import Course from '@/models/Course';
import { revalidatePath } from 'next/cache';
import { getIndustrialSession } from '@ajabadia/satellite-sdk';
import { logger } from '@ajabadia/satellite-sdk';
import { withTenantContext } from '@ajabadia/satellite-sdk';
import { resolveTargetTenantContext } from '@/lib/tenant-resolver';

// --- Tipos serializados ---

export interface SerializedCourse {
  _id: string;
  tenantId: string;
  spaceId: string;
  name: string;
  description?: string;
  tags: string[];
  learningPath: { examConfigId: string; prerequisites: string[] }[];
  active: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** Serializa un documento ICourse a objeto plano */
function serializeCourse(doc: Record<string, unknown>): SerializedCourse {
  const rawLP = doc.learningPath as Record<string, unknown>[] | undefined;
  return {
    _id: (doc._id as { toString(): string }).toString(),
    tenantId: doc.tenantId as string,
    spaceId: doc.spaceId as string,
    name: doc.name as string,
    description: doc.description as string | undefined,
    tags: (doc.tags as string[]) || [],
    learningPath: (rawLP || []).map((entry) => ({
      examConfigId: (entry.examConfigId as { toString(): string })?.toString() || '',
      prerequisites: ((entry.prerequisites as unknown[]) || []).map(
        (p) => (p as { toString(): string })?.toString() || ''
      ),
    })),
    active: doc.active as boolean,
    createdBy: doc.createdBy as string,
    createdAt: (doc.createdAt as Date)?.toISOString() || '',
    updatedAt: (doc.updatedAt as Date)?.toISOString() || '',
  };
}

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
