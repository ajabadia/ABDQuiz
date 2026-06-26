/**
 * @purpose Valida la jerarquía de espacios y cursos dentro de un inquilino, asegurando que los cursos pertenezcan a espacios activos.
 * @purpose_en Validates the hierarchy of spaces and courses within a tenant, ensuring that courses belong to active spaces.
 * @refactorable true (contains multiple functions with distinct responsibilities)
 * @classification Business Service
 * @complexity Medium
 * @fingerprint exports:4,imports:5,sig:1mojvhy
 * @lastUpdated 2026-06-26T10:01:44.096Z
 */

'use server';

import { connectDB } from '@ajabadia/satellite-sdk/db';
import { SpaceServiceClient } from '@/services/space-client';
import Course from '@/models/Course';
import { revalidatePath } from 'next/cache';
import { ensureAdminOrProfessor } from '@/lib/auth/ensureQuizAccess';

interface ActionResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface SpaceOption {
  _id: string;
  name: string;
  slug: string;
  type: string;
  isActive: boolean;
}

interface CourseOption {
  _id: string;
  name: string;
  active: boolean;
}

export interface HierarchyValidationResult {
  valid: boolean;
  spaceExists: boolean;
  spaceActive: boolean;
  spaceName?: string;
  courseExists: boolean;
  courseActive: boolean;
  courseName?: string;
  courseBelongsToSpace: boolean;
  errorType?: 'space_inactive' | 'space_not_found' | 'course_inactive' | 'course_not_found' | 'course_not_in_space';
}

/**
 * Gets active Spaces for a tenant
 */
export async function getActiveSpacesAction(): Promise<ActionResponse<SpaceOption[]>> {
  try {
    const user = await ensureAdminOrProfessor();
    const spaces = await SpaceServiceClient.getActiveSpaces(user.tenantId);
    return { success: true, data: spaces as SpaceOption[] };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Gets active courses for a Space
 */
export async function getCoursesBySpaceAction(spaceId: string): Promise<ActionResponse<CourseOption[]>> {
  try {
    const user = await ensureAdminOrProfessor();
    await connectDB();
    const courses = await Course.find({
      tenantId: user.tenantId,
      spaceId,
      active: true,
    }).select('name active').lean();
    return { success: true, data: JSON.parse(JSON.stringify(courses)) as CourseOption[] };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Validates Space + Course hierarchy
 */
export async function validateHierarchyAction(
  spaceId: string,
  courseId?: string,
): Promise<ActionResponse<HierarchyValidationResult>> {
  try {
    const user = await ensureAdminOrProfessor();
    await connectDB();

    const space = await SpaceServiceClient.getSpaceById(spaceId, user.tenantId);

    if (!space) {
      return {
        success: true,
        data: {
          valid: false, spaceExists: false, spaceActive: false,
          courseExists: false, courseActive: false, courseBelongsToSpace: false,
          errorType: 'space_not_found' as const,
        },
      };
    }

    if (!space.isActive) {
      return {
        success: true,
        data: {
          valid: false, spaceExists: true, spaceActive: false, spaceName: space.name,
          courseExists: false, courseActive: false, courseBelongsToSpace: false,
          errorType: 'space_inactive' as const,
        },
      };
    }

    if (!courseId) {
      return {
        success: true,
        data: {
          valid: true, spaceExists: true, spaceActive: true, spaceName: space.name,
          courseExists: false, courseActive: false, courseBelongsToSpace: false,
        },
      };
    }

    const course = await Course.findOne({ _id: courseId, tenantId: user.tenantId }).select('name active spaceId').lean();

    if (!course) {
      return {
        success: true,
        data: {
          valid: false, spaceExists: true, spaceActive: true, spaceName: space.name,
          courseExists: false, courseActive: false, courseBelongsToSpace: false,
          errorType: 'course_not_found' as const,
        },
      };
    }

    if (!course.active) {
      return {
        success: true,
        data: {
          valid: false, spaceExists: true, spaceActive: true, spaceName: space.name,
          courseExists: true, courseActive: false, courseName: course.name, courseBelongsToSpace: course.spaceId === spaceId,
          errorType: 'course_inactive' as const,
        },
      };
    }

    if (course.spaceId !== spaceId) {
      return {
        success: true,
        data: {
          valid: false, spaceExists: true, spaceActive: true, spaceName: space.name,
          courseExists: true, courseActive: true, courseName: course.name, courseBelongsToSpace: false,
          errorType: 'course_not_in_space' as const,
        },
      };
    }

    return {
      success: true,
      data: {
        valid: true, spaceExists: true, spaceActive: true, spaceName: space.name,
        courseExists: true, courseActive: true, courseName: course.name, courseBelongsToSpace: true,
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}
