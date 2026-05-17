import connectDB from '@/lib/database/mongodb';
import Question from '@/models/Question';
import CorpusImport from '@/models/CorpusImport';
import CorpusImportRow from '@/models/CorpusImportRow';
import { IngestQuestionSchema } from '@/lib/validation/corpusSchema';
import { generateQuestionHash } from '@/lib/corpus/hash';
import Papa from 'papaparse';

interface ZodErrorStructure {
  errors: Array<{
    path: (string | number)[];
    message: string;
  }>;
}

export class CorpusImporter {
  static async importFromJson(userId: string, tenantId: string, fileName: string, jsonData: unknown[]) {
    await connectDB();
    const corpusImport = await CorpusImport.create({
      tenantId, createdByUserId: userId, sourceType: 'json', sourceName: fileName, totalRows: jsonData.length, status: 'processing'
    });

    const results = { valid: 0, invalid: 0, duplicate: 0 };

    for (let i = 0; i < jsonData.length; i++) {
      const rawItem = jsonData[i];
      const rowNumber = i + 1;
      try {
        const validated = IngestQuestionSchema.parse(rawItem);
        const contentHash = generateQuestionHash(validated);
        const existing = await Question.findOne({ tenantId, contentHash });
        
        if (existing) {
          results.duplicate++;
          await CorpusImportRow.create({ corpusImportId: corpusImport._id, rowNumber, status: 'duplicate', questionHash: contentHash, questionId: existing._id });
          continue;
        }

        const newQuestion = await Question.create({
          tenantId, module: validated.modulo, source: validated.fuente, questionText: validated.pregunta, options: validated.opciones, 
          correctOptionIndex: validated.respuesta_correcta, explanation: validated.explicacion, tags: validated.tags, 
          difficulty: validated.difficulty, contentHash, originImportId: corpusImport._id, active: true
        });

        results.valid++;
        await CorpusImportRow.create({ corpusImportId: corpusImport._id, rowNumber, status: 'valid', questionHash: contentHash, questionId: newQuestion._id });
      } catch (error: unknown) {
        results.invalid++;
        let errorMessages: string[] = ['Unknown error'];
        
        if (error instanceof Error) {
          errorMessages = [error.message];
          
          // Type-safe Zod error extraction
          const potentialZodError = error as unknown as ZodErrorStructure;
          if (potentialZodError.errors && Array.isArray(potentialZodError.errors)) {
             errorMessages = potentialZodError.errors.map(e => `${e.path.join('.')}: ${e.message}`);
          }
        }

        await CorpusImportRow.create({
          corpusImportId: corpusImport._id, rowNumber, status: 'invalid', 
          errorMessages
        });
      }
    }

    corpusImport.status = results.invalid > 0 ? 'completed_with_errors' : 'completed';
    corpusImport.validRows = results.valid;
    corpusImport.invalidRows = results.invalid;
    corpusImport.duplicateRows = results.duplicate;
    corpusImport.finishedAt = new Date();
    await corpusImport.save();
    return corpusImport;
  }

  static async importFromCsv(userId: string, tenantId: string, fileName: string, csvContent: string) {
    const parseResult = Papa.parse<Record<string, unknown>>(csvContent, { header: true, skipEmptyLines: true, dynamicTyping: true });
    if (parseResult.errors.length > 0) throw new Error('CSV Parse Error: ' + parseResult.errors[0].message);

    const mappedData = parseResult.data.map((row) => ({
      pregunta: row.pregunta, opciones: [row.opcion_a, row.opcion_b, row.opcion_c, row.opcion_d].filter(Boolean),
      respuesta_correcta: this.mapResponseToIndex(row.respuesta_correcta), explicacion: row.explicacion,
      modulo: row.modulo || row.tema || row.category || '',
      fuente: row.fuente || row.source || '',
      difficulty: this.mapDifficulty(row.difficulty || row.dificultad || row.nivel),
      tags: row.tags ? String(row.tags).split(',').map(t => t.trim()) : []
    }));

    return this.importFromJson(userId, tenantId, fileName, mappedData);
  }

  private static mapDifficulty(val: unknown): 'easy' | 'medium' | 'hard' {
    if (!val) return 'medium';
    const str = String(val).toLowerCase().trim();
    if (str.includes('fac') || str.includes('eas') || str === '1' || str.includes('baj')) return 'easy';
    if (str.includes('dif') || str.includes('har') || str === '3' || str.includes('alt')) return 'hard';
    return 'medium';
  }

  private static mapResponseToIndex(resp: unknown): number {
    if (typeof resp === 'number') return resp;
    if (typeof resp === 'string') {
      const match = resp.trim().match(/^([A-F])/i);
      if (match) {
        const map: Record<string, number> = { 'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5 };
        return map[match[1].toUpperCase()] ?? -1;
      }
    }
    return -1;
  }
}
