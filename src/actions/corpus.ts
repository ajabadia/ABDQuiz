'use server';

import { CorpusService } from '@/services/corpus/corpusService';
import { revalidatePath } from 'next/cache';
import { ensureAdminOrProfessor } from '@/lib/auth/ensureQuizAccess';

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
