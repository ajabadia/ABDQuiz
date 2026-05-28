import { connectDB } from '@ajabadia/satellite-sdk';
import Question from '@/models/Question';
import CorpusImport from '@/models/CorpusImport';
import CorpusImportRow from '@/models/CorpusImportRow';
import { IngestQuestionSchema } from '@/lib/validation/corpusSchema';
import { generateQuestionHash, calculateSemanticHashes } from '@/lib/corpus/hash';
import Papa from 'papaparse';
import mongoose from 'mongoose';

interface ZodErrorStructure {
  errors: Array<{
    path: (string | number)[];
    message: string;
  }>;
}

export class CorpusImporter {
  static async importFromJson(userId: string, tenantId: string, fileName: string, jsonData: unknown[]) {
    await connectDB();
    
    // Detect if we can use replica-set transactions
    const session = await mongoose.startSession().catch(() => null);
    let useTransaction = false;
    if (session) {
      session.startTransaction();
      useTransaction = true;
    }

    const createdQuestions: string[] = [];
    const modifiedQuestions: { id: string; previousActive: boolean; previousVersion: number }[] = [];

    let corpusImport;
    if (useTransaction && session) {
      const res = await CorpusImport.create([{
        tenantId, createdByUserId: userId, sourceType: 'json', sourceName: fileName, totalRows: jsonData.length, status: 'processing'
      }], { session });
      corpusImport = res[0];
    } else {
      corpusImport = await CorpusImport.create({
        tenantId, createdByUserId: userId, sourceType: 'json', sourceName: fileName, totalRows: jsonData.length, status: 'processing'
      });
    }

    const results = { valid: 0, invalid: 0, duplicate: 0 };

    try {
      for (let i = 0; i < jsonData.length; i++) {
        const rawItem = jsonData[i];
        const rowNumber = i + 1;
        try {
          const validated = IngestQuestionSchema.parse(rawItem);
          const { questionTextHash, optionHashes, contentHash } = calculateSemanticHashes(
            validated.pregunta,
            validated.opciones,
            validated.respuesta_correcta
          );

          const query = Question.findOne({ tenantId, contentHash });
          if (useTransaction && session) {
            query.session(session);
          }
          const existing = await query;
          
          if (existing) {
            results.duplicate++;
            if (useTransaction && session) {
              await CorpusImportRow.create([{
                corpusImportId: corpusImport._id, rowNumber, status: 'duplicate', questionHash: contentHash, questionId: existing._id
              }], { session });
            } else {
              await CorpusImportRow.create({
                corpusImportId: corpusImport._id, rowNumber, status: 'duplicate', questionHash: contentHash, questionId: existing._id
              });
            }
            continue;
          }

          // Insert new question
          let newQuestionDoc;
          const questionData = {
            tenantId,
            module: validated.modulo,
            source: validated.fuente,
            questionText: validated.pregunta,
            options: validated.opciones, 
            correctOptionIndex: validated.respuesta_correcta,
            explanation: validated.explicacion,
            tags: validated.tags, 
            difficulty: validated.difficulty,
            questionTextHash,
            optionHashes,
            contentHash,
            spaceId: validated.spaceId,
            courseId: validated.courseId,
            originImportId: corpusImport._id,
            active: true
          };

          if (useTransaction && session) {
            const res = await Question.create([questionData], { session });
            newQuestionDoc = res[0];
          } else {
            newQuestionDoc = await Question.create(questionData);
          }

          createdQuestions.push(newQuestionDoc._id.toString());

          results.valid++;
          if (useTransaction && session) {
            await CorpusImportRow.create([{
              corpusImportId: corpusImport._id, rowNumber, status: 'valid', questionHash: contentHash, questionId: newQuestionDoc._id
            }], { session });
          } else {
            await CorpusImportRow.create({
              corpusImportId: corpusImport._id, rowNumber, status: 'valid', questionHash: contentHash, questionId: newQuestionDoc._id
            });
          }
        } catch (error: unknown) {
          results.invalid++;
          let errorMessages: string[] = ['Unknown error'];
          
          if (error instanceof Error) {
            errorMessages = [error.message];
            
            const potentialZodError = error as unknown as ZodErrorStructure;
            if (potentialZodError.errors && Array.isArray(potentialZodError.errors)) {
               errorMessages = potentialZodError.errors.map(e => `${e.path.join('.')}: ${e.message}`);
            }
          }

          if (useTransaction && session) {
            await CorpusImportRow.create([{
              corpusImportId: corpusImport._id, rowNumber, status: 'invalid', 
              errorMessages
            }], { session });
          } else {
            await CorpusImportRow.create({
              corpusImportId: corpusImport._id, rowNumber, status: 'invalid', 
              errorMessages
            });
          }
        }
      }

      if (useTransaction && session) {
        await session.commitTransaction();
        session.endSession();
      }
    } catch (error) {
      if (useTransaction && session) {
        await session.abortTransaction();
        session.endSession();
      } else {
        // Compensating manual rollback for Standalone MongoDB
        for (const qId of createdQuestions) {
          await Question.deleteOne({ _id: qId });
        }
        for (const mod of modifiedQuestions) {
          await Question.updateOne(
            { _id: mod.id },
            { active: mod.previousActive, version: mod.previousVersion }
          );
        }
      }
      
      // Update import status to failed
      corpusImport.status = 'failed';
      corpusImport.finishedAt = new Date();
      await corpusImport.save();
      throw error;
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
      tags: row.tags ? String(row.tags).split(',').map(t => t.trim()) : [],
      spaceId: row.spaceId ? String(row.spaceId) : undefined,
      courseId: row.courseId ? String(row.courseId) : undefined,
    }));

    return this.importFromJson(userId, tenantId, fileName, mappedData);
  }

  private static mapDifficulty(val: unknown): 'easy' | 'medium' | 'hard' {
    if (!val) return 'medium';
    const str = String(val).toLowerCase().trim();
    
    const EASY_KEYWORDS = new Set(['facil', 'fácil', 'easy', '1', 'bajo', 'baja']);
    const HARD_KEYWORDS = new Set(['dificil', 'difícil', 'hard', '3', 'alto', 'alta']);
    
    if (EASY_KEYWORDS.has(str)) return 'easy';
    if (HARD_KEYWORDS.has(str)) return 'hard';
    
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
