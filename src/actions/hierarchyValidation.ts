'use server';

import { connectDB, getIndustrialSession, logger, withTenantContext, resolveTargetTenantContext } from '@ajabadia/satellite-sdk';
import Space from '@/models/Space';
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
    await connectDB();
    const spaces = await Space.find({
      tenantId: user.tenantId,
      isActive: true,
    }).select('name slug type isActive').lean();
    return { success: true, data: JSON.parse(JSON.stringify(spaces)) as SpaceOption[] };
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

    const space = await Space.findOne({ _id: spaceId, tenantId: user.tenantId }).select('name isActive').lean();

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
