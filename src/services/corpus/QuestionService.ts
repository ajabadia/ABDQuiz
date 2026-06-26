/**
 * @purpose Gestiona y recupera preguntas para un inquilino, verifica la rastreabilidad de las preguntas y guarda o divide preguntas con versionado.
 * @purpose_en Manages and retrieves questions for a tenant, checks question traceability, and saves or forks questions with versioning.
 * @refactorable true (contains multiple business logic functions)
 * @classification Business Service
 * @complexity Medium
 * @fingerprint exports:2,imports:4,sig:3ufcyh
 * @lastUpdated 2026-06-26T10:03:28.401Z
 */

import { connectDB } from '@ajabadia/satellite-sdk/db';
import Question, { type IQuestion } from '@/models/Question';
import ExamAttempt from '@/models/ExamAttempt';
import { generateQuestionHash } from '@/lib/corpus/hash';

export interface QuestionFilters {
  page?: number;
  limit?: number;
  module?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  active?: boolean;
  search?: string;
  courseIds?: string[];
}

export class QuestionService {
  /**
   * Obtiene preguntas paginadas y filtradas para el tenant
   */
  static async getQuestions(tenantId: string, filters: QuestionFilters) {
    await connectDB();
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { tenantId };

    if (filters.active !== undefined) {
      query.active = filters.active;
    }

    if (filters.module) {
      query.module = filters.module;
    }

    if (filters.difficulty) {
      query.difficulty = filters.difficulty;
    }

    if (filters.search) {
      query.questionText = { $regex: filters.search, $options: 'i' };
    }

    if (filters.courseIds && filters.courseIds.length > 0) {
      query.courseId = { $in: filters.courseIds };
    }

    const [questions, total] = await Promise.all([
      Question.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Question.countDocuments(query)
    ]);

    return {
      questions: JSON.parse(JSON.stringify(questions)) as IQuestion[],
      total,
      page,
      pages: Math.ceil(total / limit)
    };
  }

  /**
   * Verifica si una pregunta ya ha sido respondida en algún examen del historial
   */
  static async checkTraceability(questionId: string): Promise<boolean> {
    await connectDB();
    const attemptCount = await ExamAttempt.countDocuments({
      'questions.questionId': questionId
    });
    return attemptCount > 0;
  }

  /**
   * Guarda o bifurca un reactivo respetando el versionado histórico (Copy-On-Write)
   */
  static async saveQuestion(
    questionId: string,
    updatedData: {
      questionText: string;
      options: string[];
      correctOptionIndex: number;
      explanation: string;
      difficulty: 'easy' | 'medium' | 'hard';
      module: string;
      source: string;
      tags: string[];
      /** §12.A — Adjuntos */
      attachments?: { url: string; name: string; type: string; size: number }[];
    }
  ): Promise<IQuestion> {
    await connectDB();

    // 1. Recuperar reactivo original
    const oldQuestion = await Question.findById(questionId);
    if (!oldQuestion) {
      throw new Error('El reactivo especificado no existe');
    }

    const tenantId = oldQuestion.tenantId;

    // 2. Generar el nuevo contentHash semántico
    const contentHashInput = {
      pregunta: updatedData.questionText,
      opciones: updatedData.options,
      respuesta_correcta: updatedData.correctOptionIndex,
      modulo: updatedData.module,
      fuente: updatedData.source,
      explicacion: updatedData.explanation,
      difficulty: updatedData.difficulty,
      tags: updatedData.tags
    };
    
    const newHash = generateQuestionHash(contentHashInput);

    // 3. Verificar trazabilidad en el historial
    const hasBeenAnswered = await this.checkTraceability(questionId);

    if (!hasBeenAnswered) {
      // CASO A: Edición Directa (In-Place Edit)
      const updated = await Question.findByIdAndUpdate(
        questionId,
        {
          ...updatedData,
          contentHash: newHash
        },
        { new: true, runValidators: true }
      );
      if (!updated) throw new Error('Error al actualizar el reactivo in-place');
      return JSON.parse(JSON.stringify(updated)) as IQuestion;
    } else {
      // CASO B: Bifurcación por Trazabilidad (Copy-On-Write)
      
      // 1. Desactivar el reactivo anterior en base de datos
      oldQuestion.active = false;
      await oldQuestion.save();

      // 2. Crear una nueva versión activa (incrementando la versión)
      const newQuestion = await Question.create({
        tenantId,
        ...updatedData,
        contentHash: newHash,
        version: oldQuestion.version + 1,
        active: true,
        spaceId: oldQuestion.spaceId,
        courseId: oldQuestion.courseId,
        originImportId: oldQuestion.originImportId // Mantenemos link de trazabilidad de importación
      });

      return JSON.parse(JSON.stringify(newQuestion)) as IQuestion;
    }
  }
}
