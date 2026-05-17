'use server';

import { QuestionService, type QuestionFilters } from '@/services/corpus/QuestionService';
import { revalidatePath } from 'next/cache';
import { ensureIndustrialAccess } from '@/lib/session';
import { type IQuestion } from '@/models/Question';

interface ActionResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Obtiene el listado paginado y filtrado de preguntas para el tenant activo
 */
export async function getQuestionsAction(
  filters: QuestionFilters
): Promise<ActionResponse<{ questions: IQuestion[]; total: number; page: number; pages: number }>> {
  try {
    const user = await ensureIndustrialAccess('ADMIN');
    const result = await QuestionService.getQuestions(user.tenantId, filters);
    return { success: true, data: result };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Verifica si un reactivo específico ha sido respondido en exámenes pasados
 */
export async function checkQuestionTraceabilityAction(
  questionId: string
): Promise<ActionResponse<boolean>> {
  try {
    await ensureIndustrialAccess('ADMIN');
    const result = await QuestionService.checkTraceability(questionId);
    return { success: true, data: result };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
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
  try {
    await ensureIndustrialAccess('ADMIN');
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
}
