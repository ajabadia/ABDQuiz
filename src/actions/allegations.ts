'use server';

import { AllegationService } from '@/services/allegations/allegationService';
import { ensureAdminOrProfessor } from '@/lib/auth/ensureQuizAccess';
import { ensureIndustrialAccess } from '@ajabadia/satellite-sdk';
import { revalidatePath } from 'next/cache';
import { type IAllegation } from '@/models/Allegation';
import { withTenantContext } from '@ajabadia/satellite-sdk';
import { resolveTargetTenantContext } from '@/lib/tenant-resolver';

interface ActionResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Registra una reclamación técnica enviada por un alumno
 */
export async function submitAllegationAction(formData: {
  examAttemptId: string;
  questionId: string;
  reason: string;
}): Promise<ActionResponse<IAllegation>> {
  return withTenantContext(async () => {
    try {
      // 1. Verificar sesión del alumno
      const user = await ensureIndustrialAccess();
      
      // 2. Ejecutar la inserción
      const allegation = await AllegationService.submitAllegation(
        user.id,
        user.tenantId,
        user.email,
        `${user.name} ${user.surname}`,
        formData.examAttemptId,
        formData.questionId,
        formData.reason
      );

      // Revalidar la vista de resultados del examen
      revalidatePath(`/quiz/${formData.examAttemptId}`);
      revalidatePath(`/quiz/${formData.examAttemptId}/results`);

      return { success: true, data: allegation };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ [SUBMIT_ALLEGATION_ACTION_ERROR]:', message);
      return { success: false, error: message };
    }
  });
}

/**
 * Resuelve una reclamación técnica aplicando correcciones y recalculando notas
 */
export async function resolveAllegationAction(formData: {
  allegationId: string;
  resolutionMode: 'CORRECTION_SHIFT' | 'CANCEL_QUESTION' | 'GIVE_POINTS_TO_ALL';
  feedback: string;
  nextCorrectOptionIndex?: number;
}, tenantIdParam?: string): Promise<ActionResponse<IAllegation>> {
  const explicitCtx = await resolveTargetTenantContext(tenantIdParam);
  
  return withTenantContext(async () => {
    try {
      // 1. Verificar privilegios de administrador/profesor
      const user = await ensureAdminOrProfessor();

      // 2. Resolver la reclamación y disparar recálculo
      const allegation = await AllegationService.resolveAllegation(
        formData.allegationId,
        formData.resolutionMode,
        formData.feedback,
        `${user.name} ${user.surname}`,
        formData.nextCorrectOptionIndex
      );

      // 3. Forzar revalidación de las consolas e historial
      revalidatePath('/admin/allegations');
      revalidatePath('/admin/questions');
      revalidatePath('/admin/corpus');
      revalidatePath('/history');
      revalidatePath('/exams');

      return { success: true, data: allegation };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ [RESOLVE_ALLEGATION_ACTION_ERROR]:', message);
      return { success: false, error: message };
    }
  }, explicitCtx);
}

/**
 * Rechaza una reclamación directamente
 */
export async function rejectAllegationAction(formData: {
  allegationId: string;
  feedback: string;
}, tenantIdParam?: string): Promise<ActionResponse<IAllegation>> {
  const explicitCtx = await resolveTargetTenantContext(tenantIdParam);
  
  return withTenantContext(async () => {
    try {
      const user = await ensureAdminOrProfessor();

      const allegation = await AllegationService.rejectAllegation(
        formData.allegationId,
        formData.feedback,
        `${user.name} ${user.surname}`
      );

      revalidatePath('/admin/allegations');

      return { success: true, data: allegation };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ [REJECT_ALLEGATION_ACTION_ERROR]:', message);
      return { success: false, error: message };
    }
  }, explicitCtx);
}

/**
 * Obtiene todas las reclamaciones del tenant del administrador
 */
export async function getTenantAllegationsAction(tenantIdParam?: string): Promise<ActionResponse<IAllegation[]>> {
  const explicitCtx = await resolveTargetTenantContext(tenantIdParam);
  
  return withTenantContext(async () => {
    try {
      const user = await ensureAdminOrProfessor();
      const activeTenantId = explicitCtx?.tenantId || user.tenantId;
      const allegations = await AllegationService.getTenantAllegations(activeTenantId);
      return { success: true, data: allegations };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ [GET_TENANT_ALLEGATIONS_ACTION_ERROR]:', message);
      return { success: false, error: message };
    }
  }, explicitCtx);
}
