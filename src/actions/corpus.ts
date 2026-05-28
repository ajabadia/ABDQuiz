'use server';

import { CorpusService } from '@/services/corpus/corpusService';
import { revalidatePath } from 'next/cache';
import { ensureAdminOrProfessor } from '@/lib/auth/ensureQuizAccess';
import { connectDB } from '@ajabadia/satellite-sdk';
import Space from '@/models/Space';
import Course from '@/models/Course';

interface ActionResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface ImportSummary {
  validRows: number;
  duplicateRows: number;
  invalidRows: number;
  sourceName: string;
}

interface CorpusStats {
  totalQuestions: number;
  activeQuestions: number;
  moduleCount: number;
  sourceCount: number;
  duplicatesLast30Days: number;
  modules: string[];
  sources: string[];
}

/**
 * Procesa la importación de un archivo de corpus
 */
export async function importCorpusAction(formData: FormData): Promise<ActionResponse<ImportSummary>> {
  const user = await ensureAdminOrProfessor();
  const file = formData.get('file') as File;
  let sourceType = formData.get('sourceType') as 'json' | 'csv';
  if (!file) throw new Error('No se ha proporcionado ningún archivo');

  const content = await file.text();
  
  // Auto-detect JSON if it looks like it (fallback for extension mismatch)
  if (sourceType === 'csv' && (content.trim().startsWith('[') || content.trim().startsWith('{'))) {
    try {
      JSON.parse(content);
      sourceType = 'json';
    } catch { /* stick with csv */ }
  }

  let result;

  try {
    if (sourceType === 'json') {
      const jsonData = JSON.parse(content);
      result = await CorpusService.importFromJson(
        user.id,
        user.tenantId,
        file.name,
        Array.isArray(jsonData) ? jsonData : [jsonData]
      );
    } else {
      result = await CorpusService.importFromCsv(
        user.id,
        user.tenantId,
        file.name,
        content
      );
    }

    revalidatePath('/admin/corpus');
    return { 
      success: true, 
      data: JSON.parse(JSON.stringify(result)) as ImportSummary
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Obtiene el listado de importaciones filtrado
 */
export async function getImportsAction(filters: {
  startDate?: string;
  endDate?: string;
  status?: string;
  sourceType?: string;
  module?: string;
  source?: string;
}): Promise<ActionResponse<unknown[]>> {
  try {
    const user = await ensureAdminOrProfessor();
    const data = await CorpusService.getImports(user.tenantId, {
      ...filters,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
    });
    return { success: true, data: JSON.parse(JSON.stringify(data)) as unknown[] };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Obtiene el detalle de un lote específico
 */
export async function getImportDetailAction(importId: string): Promise<ActionResponse<unknown>> {
  try {
    await ensureAdminOrProfessor();
    const data = await CorpusService.getImportDetail(importId);
    return { success: true, data: JSON.parse(JSON.stringify(data)) };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Obtiene las estadísticas del corpus
 */
export async function getCorpusStatsAction(): Promise<ActionResponse<CorpusStats>> {
  try {
    const user = await ensureAdminOrProfessor();
    const stats = await CorpusService.getStats(user.tenantId);
    return { success: true, data: JSON.parse(JSON.stringify(stats)) as CorpusStats };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Ingesta un bloque de preguntas finalizado tras subsanación interactiva
 */
export async function importFinalizedQuestionsAction(
  questions: unknown[],
  fileName: string
): Promise<ActionResponse<ImportSummary>> {
  try {
    const user = await ensureAdminOrProfessor();
    const result = await CorpusService.importFromJson(
      user.id,
      user.tenantId,
      fileName,
      questions
    );
    revalidatePath('/admin/corpus');
    return { 
      success: true, 
      data: JSON.parse(JSON.stringify(result)) as ImportSummary
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

// ──────────────────────────────────────────────
//  Remediation IDs — Server Actions
// ──────────────────────────────────────────────

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

interface HierarchyValidationResult {
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
 * Obtiene los Spaces activos para un tenant
 */
export async function getActiveSpacesAction(): Promise<ActionResponse<SpaceOption[]>> {
  try {
    const user = await ensureAdminOrProfessor();
    await connectDB();
    const spaces = await Space.find({
      tenantId: user.tenantId,
      isActive: true
    }).select('name slug type isActive').lean();
    return { success: true, data: JSON.parse(JSON.stringify(spaces)) as SpaceOption[] };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Obtiene los cursos activos de un Space
 */
export async function getCoursesBySpaceAction(spaceId: string): Promise<ActionResponse<CourseOption[]>> {
  try {
    const user = await ensureAdminOrProfessor();
    await connectDB();
    const courses = await Course.find({
      tenantId: user.tenantId,
      spaceId,
      active: true
    }).select('name active').lean();
    return { success: true, data: JSON.parse(JSON.stringify(courses)) as CourseOption[] };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Valida la jerarquía de un par Space + Course
 */
export async function validateHierarchyAction(
  spaceId: string,
  courseId?: string
): Promise<ActionResponse<HierarchyValidationResult>> {
  try {
    const user = await ensureAdminOrProfessor();
    await connectDB();

    const space = await Space.findOne({ _id: spaceId, tenantId: user.tenantId }).select('name isActive').lean();

    if (!space) {
      return {
        success: true,
        data: {
          valid: false,
          spaceExists: false,
          spaceActive: false,
          courseExists: false,
          courseActive: false,
          courseBelongsToSpace: false,
          errorType: 'space_not_found'
        }
      };
    }

    if (!space.isActive) {
      return {
        success: true,
        data: {
          valid: false,
          spaceExists: true,
          spaceActive: false,
          spaceName: space.name,
          courseExists: false,
          courseActive: false,
          courseBelongsToSpace: false,
          errorType: 'space_inactive'
        }
      };
    }

    // No hay courseId para validar -> jerarquía válida si space está activo
    if (!courseId) {
      return {
        success: true,
        data: {
          valid: true,
          spaceExists: true,
          spaceActive: true,
          spaceName: space.name,
          courseExists: false,
          courseActive: false,
          courseBelongsToSpace: false
        }
      };
    }

    const course = await Course.findOne({ _id: courseId, tenantId: user.tenantId }).select('name active spaceId').lean();

    if (!course) {
      return {
        success: true,
        data: {
          valid: false,
          spaceExists: true,
          spaceActive: true,
          spaceName: space.name,
          courseExists: false,
          courseActive: false,
          courseBelongsToSpace: false,
          errorType: 'course_not_found'
        }
      };
    }

    if (!course.active) {
      return {
        success: true,
        data: {
          valid: false,
          spaceExists: true,
          spaceActive: true,
          spaceName: space.name,
          courseExists: true,
          courseActive: false,
          courseName: course.name,
          courseBelongsToSpace: course.spaceId === spaceId,
          errorType: 'course_inactive'
        }
      };
    }

    if (course.spaceId !== spaceId) {
      return {
        success: true,
        data: {
          valid: false,
          spaceExists: true,
          spaceActive: true,
          spaceName: space.name,
          courseExists: true,
          courseActive: true,
          courseName: course.name,
          courseBelongsToSpace: false,
          errorType: 'course_not_in_space'
        }
      };
    }

    return {
      success: true,
      data: {
        valid: true,
        spaceExists: true,
        spaceActive: true,
        spaceName: space.name,
        courseExists: true,
        courseActive: true,
        courseName: course.name,
        courseBelongsToSpace: true
      }
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}
