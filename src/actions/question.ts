'use server';

import { QuestionService, type QuestionFilters } from '@/services/corpus/QuestionService';
import { revalidatePath } from 'next/cache';
import { ensureIndustrialAccess } from '@/lib/session';
import { type IQuestion } from '@/models/Question';
import connectDB from '@/lib/database/mongodb';
import Question from '@/models/Question';
import { withTenantContext } from '@/lib/database/tenant-model';

interface ActionResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Obtiene el listado paginado y filtrado de preguntas para el tenant activo
 */
export async function getQuestionsAction(
  filters: QuestionFilters,
  tenantIdParam?: string
): Promise<ActionResponse<{ questions: IQuestion[]; total: number; page: number; pages: number }>> {
  return withTenantContext(async () => {
    try {
      const user = await ensureIndustrialAccess('ADMIN');
      let activeTenantId = user.tenantId;
      if (user.role === 'SUPER_ADMIN' && tenantIdParam) {
        activeTenantId = tenantIdParam;
      }
      const result = await QuestionService.getQuestions(activeTenantId, filters);
      return { success: true, data: result };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });
}

/**
 * Verifica si un reactivo específico ha sido respondido en exámenes pasados
 */
export async function checkQuestionTraceabilityAction(
  questionId: string
): Promise<ActionResponse<boolean>> {
  return withTenantContext(async () => {
    try {
      const user = await ensureIndustrialAccess('ADMIN');
      await connectDB();
      const oldQuestion = await Question.findById(questionId);
      if (!oldQuestion) {
        return { success: false, error: 'Reactivo no encontrado' };
      }
      if (oldQuestion.tenantId !== user.tenantId && user.role !== 'SUPER_ADMIN') {
        return { success: false, error: 'Acceso no autorizado' };
      }
      const result = await QuestionService.checkTraceability(questionId);
      return { success: true, data: result };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });
}

/**
 * Guarda o bifurca un reactivo respetando el versionado histórico (Copy-On-Write)
 */
export async function saveQuestionAction(
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
  }
): Promise<ActionResponse<IQuestion>> {
  return withTenantContext(async () => {
    try {
      const user = await ensureIndustrialAccess('ADMIN');
      await connectDB();
      const oldQuestion = await Question.findById(questionId);
      if (!oldQuestion) {
        return { success: false, error: 'Reactivo no encontrado' };
      }
      if (oldQuestion.tenantId !== user.tenantId && user.role !== 'SUPER_ADMIN') {
        return { success: false, error: 'Acceso no autorizado' };
      }
      const result = await QuestionService.saveQuestion(questionId, updatedData);
      
      // Forzar revalidación de las consolas de simulación y administración
      revalidatePath('/admin/corpus');
      revalidatePath('/admin/questions');
      revalidatePath('/exams');
      
      return { success: true, data: result };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });
}
