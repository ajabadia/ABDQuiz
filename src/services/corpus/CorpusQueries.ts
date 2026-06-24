/**
 * @purpose Gestiona consultas a bases de datos para datos del corpus, incluyendo importaciones y estadísticas.
 * @purpose_en Manages database queries for corpus data, including imports and statistics.
 * @refactorable false
 * @classification Business Service
 * @complexity Medium
 * @fingerprint exports:1,imports:4,sig:a39po4
 * @lastUpdated 2026-06-23T19:53:11.162Z
 */

import { connectDB } from '@ajabadia/satellite-sdk';
import Question from '@/models/Question';
import CorpusImport from '@/models/CorpusImport';
import CorpusImportRow from '@/models/CorpusImportRow';

interface CorpusFilters {
  startDate?: Date;
  endDate?: Date;
  status?: string;
  sourceType?: string;
  module?: string;
  source?: string;
}

export class CorpusQueries {
  static async getImports(tenantId: string, filters: CorpusFilters) {
    await connectDB();
    const query: Record<string, unknown> = { tenantId };

    if (filters.startDate || filters.endDate) {
      const dateRange: Record<string, Date> = {};
      if (filters.startDate) dateRange.$gte = filters.startDate;
      if (filters.endDate) dateRange.$lte = filters.endDate;
      query.createdAt = dateRange;
    }

    if (filters.status) query.status = filters.status;
    if (filters.sourceType) query.sourceType = filters.sourceType;

    return CorpusImport.find(query).sort({ createdAt: -1 });
  }

  static async getStats(tenantId: string) {
    await connectDB();
    const [totalQuestions, activeQuestions, modules, sources, duplicatesResult] = await Promise.all([
      Question.countDocuments({ tenantId }),
      Question.countDocuments({ tenantId, active: true }),
      Question.distinct('module', { tenantId }),
      Question.distinct('source', { tenantId }),
      CorpusImport.aggregate([
        { $match: { tenantId, createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
        { $group: { _id: null, total: { $sum: "$duplicateRows" } } }
      ])
    ]);

    const duplicatesLast30Days = (duplicatesResult as Array<{total: number}>)[0]?.total || 0;

    return {
      totalQuestions, activeQuestions, moduleCount: (modules as string[]).length, sourceCount: (sources as string[]).length,
      duplicatesLast30Days, modules: modules as string[], sources: sources as string[]
    };
  }

  static async getImportDetail(importId: string) {
    await connectDB();
    const [importLog, rows] = await Promise.all([
      CorpusImport.findById(importId),
      CorpusImportRow.find({ corpusImportId: importId }).sort({ rowNumber: 1 })
    ]);
    return { importLog, rows };
  }
}
