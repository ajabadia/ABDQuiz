import { CorpusImporter } from './CorpusImporter';
import { CorpusQueries } from './CorpusQueries';

interface CorpusFilters {
  startDate?: Date;
  endDate?: Date;
  status?: string;
  sourceType?: string;
  module?: string;
  source?: string;
}

/**
 * ABDQuiz CORPUS SERVICE
 * Orchestrates data ingestion and analysis.
 * Decomposed to satisfy Fire Rules (Max 150 lines).
 */
export class CorpusService {
  static async importFromJson(userId: string, tenantId: string, fileName: string, jsonData: unknown[]) {
    return CorpusImporter.importFromJson(userId, tenantId, fileName, jsonData);
  }

  static async importFromCsv(userId: string, tenantId: string, fileName: string, csvContent: string) {
    return CorpusImporter.importFromCsv(userId, tenantId, fileName, csvContent);
  }

  static async getImports(tenantId: string, filters: CorpusFilters) {
    return CorpusQueries.getImports(tenantId, filters);
  }

  static async getStats(tenantId: string) {
    return CorpusQueries.getStats(tenantId);
  }

  static async getImportDetail(importId: string) {
    return CorpusQueries.getImportDetail(importId);
  }
}
