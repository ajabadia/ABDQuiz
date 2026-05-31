'use server';

import { QuestionService, type QuestionFilters } from '@/services/corpus/QuestionService';
import { revalidatePath } from 'next/cache';
import { ensureAdminOrProfessor } from '@/lib/auth/ensureQuizAccess';
import { type IQuestion } from '@/models/Question';
import { connectDB, withTenantContext, resolveTargetTenantContext } from '@ajabadia/satellite-sdk';
import Question from '@/models/Question';

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
  const explicitCtx = await resolveTargetTenantContext(tenantIdParam);
  
  return withTenantContext(async () => {
    try {
      const user = await ensureAdminOrProfessor();
      const activeTenantId = explicitCtx?.tenantId || user.tenantId;
      const result = await QuestionService.getQuestions(activeTenantId, filters);
      return { success: true, data: result };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }, explicitCtx);
}

/**
 * Verifica si un reactivo específico ha sido respondido en exámenes pasados
 */
export async function checkQuestionTraceabilityAction(
  questionId: string,
  tenantIdParam?: string
): Promise<ActionResponse<boolean>> {
  const explicitCtx = await resolveTargetTenantContext(tenantIdParam);
  
  return withTenantContext(async () => {
    try {
      const user = await ensureAdminOrProfessor();
      await connectDB();
      const oldQuestion = await Question.findById(questionId);
      if (!oldQuestion) {
        return { success: false, error: 'Reactivo no encontrado' };
      }
      const activeTenantId = explicitCtx?.tenantId || user.tenantId;
      if (oldQuestion.tenantId !== activeTenantId && user.role !== 'SUPER_ADMIN') {
        return { success: false, error: 'Acceso no autorizado' };
      }
      const result = await QuestionService.checkTraceability(questionId);
      return { success: true, data: result };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }, explicitCtx);
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
    /** §12.A — Adjuntos */
    attachments?: { url: string; name: string; type: string; size: number }[];
  },
  tenantIdParam?: string
): Promise<ActionResponse<IQuestion>> {
  const explicitCtx = await resolveTargetTenantContext(tenantIdParam);
  
  return withTenantContext(async () => {
    try {
      const user = await ensureAdminOrProfessor();
      await connectDB();
      const oldQuestion = await Question.findById(questionId);
      if (!oldQuestion) {
        return { success: false, error: 'Reactivo no encontrado' };
      }
      const activeTenantId = explicitCtx?.tenantId || user.tenantId;
      if (oldQuestion.tenantId !== activeTenantId && user.role !== 'SUPER_ADMIN') {
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
  }, explicitCtx);
}
