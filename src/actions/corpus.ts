'use server';

import { CorpusService } from '@/services/corpus/corpusService';
import { revalidatePath } from 'next/cache';

const DEFAULT_TENANT = process.env.SINGLE_TENANT_ID || "abd_global";
const FAKE_ADMIN_ID = "admin_001";

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
        FAKE_ADMIN_ID,
        DEFAULT_TENANT,
        file.name,
        Array.isArray(jsonData) ? jsonData : [jsonData]
      );
    } else {
      result = await CorpusService.importFromCsv(
        FAKE_ADMIN_ID,
        DEFAULT_TENANT,
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
    console.error('Import Error:', message);
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
    const data = await CorpusService.getImports(DEFAULT_TENANT, {
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
    const stats = await CorpusService.getStats(DEFAULT_TENANT);
    return { success: true, data: JSON.parse(JSON.stringify(stats)) as CorpusStats };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}
