'use server';

import { connectDB } from '@ajabadia/satellite-sdk';
import ExamConfig from '@/models/ExamConfig';
import { revalidatePath } from 'next/cache';
import { type IExamConfig } from '@/models/ExamConfig';
import { getIndustrialSession } from '@ajabadia/satellite-sdk';
import { logger } from '@ajabadia/satellite-sdk';
import { withTenantContext } from '@ajabadia/satellite-sdk';
import { resolveTargetTenantContext } from '@/lib/tenant-resolver';

import { type SerializedExamConfig } from '@/types/quiz';



/**
 * Recupera todas las configuraciones de examen activas para el tenant
 */
export async function getExamConfigsAction(tenantIdParam?: string) {
  const explicitCtx = await resolveTargetTenantContext(tenantIdParam);
  
  return withTenantContext(async () => {
    try {
      await connectDB();
      const session = await getIndustrialSession();
      
      if (!session?.user?.id || !session?.user?.tenantId) {
        throw new Error('Unauthorized');
      }
      
      const activeTenantId = explicitCtx?.tenantId || session.user.tenantId;

      let configs = await ExamConfig.find({ 
        tenantId: activeTenantId,
        active: true 
      }).sort({ createdAt: -1 }).lean();
      
      // Seed default configurations if none exist
      if (configs.length === 0) {
        const defaultConfigs = [
          {
            tenantId: activeTenantId,
            name: 'Entrenamiento Libre',
            description: 'Feedback inmediato, explicaciones detalladas y sin presión de tiempo global. Ideal para asentar conceptos.',
            questionCount: 10,
            moduleFilter: [],
            globalTimeLimitSeconds: 0,
            questionTimeLimitSeconds: 0,
            scoringMode: 'simple',
            passThreshold: 70,
            showFeedbackDuringExam: true,
            allowSkip: true,
            allowReviewPrevious: true,
            autoAdvanceOnSelect: false,
            reviewOmittedQuestions: false,
            maxAttempts: 0,
            sliceOptionsCount: null,
            isDefault: true,
            createdBy: session.user.id,
            active: true
          },
          {
            tenantId: activeTenantId,
            name: 'Simulacro Estándar',
            description: 'Condiciones reales. 10 minutos, 30s por tarea, sin vuelta atrás. La prueba definitiva.',
            questionCount: 30,
            moduleFilter: [],
            globalTimeLimitSeconds: 600,
            questionTimeLimitSeconds: 30,
            scoringMode: 'simple',
            passThreshold: 70,
            showFeedbackDuringExam: false,
            allowSkip: true,
            allowReviewPrevious: false,
            autoAdvanceOnSelect: false,
            reviewOmittedQuestions: false,
            maxAttempts: 0,
            sliceOptionsCount: null,
            isDefault: true,
            createdBy: session.user.id,
            active: true
          }
        ];
        await ExamConfig.insertMany(defaultConfigs);
        configs = await ExamConfig.find({ 
          tenantId: activeTenantId,
          active: true 
        }).sort({ createdAt: -1 }).lean();
      }
      
      // Convert ObjectIds to strings
      return configs.map((c) => {
        const doc = c as unknown as Record<string, unknown>;
        return {
          ...doc,
          _id: (doc._id as { toString(): string }).toString(),
          createdAt: (doc.createdAt as Date | undefined)?.toISOString() || '',
          updatedAt: (doc.updatedAt as Date | undefined)?.toISOString() || ''
        } as unknown as SerializedExamConfig;
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error fetching exam configs:', msg);
      throw new Error(msg); // Do not silence
    }
  }, explicitCtx);
}

/**
 * Crea una nueva configuración de examen
 */
export async function createExamConfigAction(data: Partial<IExamConfig>, tenantIdParam?: string) {
  const explicitCtx = await resolveTargetTenantContext(tenantIdParam);
  
  return withTenantContext(async () => {
    try {
      await connectDB();
      const session = await getIndustrialSession();
      
      if (!session?.user?.id || !session?.user?.tenantId) {
        return { success: false, error: 'Unauthorized' };
      }
      
      const activeTenantId = explicitCtx?.tenantId || session.user.tenantId;
      
      const newConfig = await ExamConfig.create({
        ...data,
        tenantId: activeTenantId,
        createdBy: session.user.id,
      });
      
      // Log the creation event
      await logger.audit({
        tenantId: activeTenantId,
        action: 'EXAM_CONFIG_CREATED',
        entityType: 'CONFIG',
        entityId: newConfig._id.toString(),
        userId: session.user.id,
        userEmail: session.user.email || 'system@abd.com',
        changedFields: { ...data, tenantId: activeTenantId },
      });
      
      revalidatePath('/admin/exams');
      revalidatePath('/'); // Para actualizar la home si muestra configs dinámicas
      
      return { success: true, id: newConfig._id.toString() };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error creating exam config:', msg);
      return { success: false, error: msg };
    }
  }, explicitCtx);
}

/**
 * Actualiza una configuración existente
 */
export async function updateExamConfigAction(id: string, data: Partial<IExamConfig>, tenantIdParam?: string) {
  const explicitCtx = await resolveTargetTenantContext(tenantIdParam);
  
  return withTenantContext(async () => {
    try {
      await connectDB();
      const session = await getIndustrialSession();
      
      if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

      const config = await ExamConfig.findById(id);
      if (!config) {
        return { success: false, error: 'Acceso no autorizado' };
      }

      // Anti-IDOR Guard
      const activeTenantId = explicitCtx?.tenantId || session.user.tenantId;
      if (config.tenantId !== activeTenantId && session.user.role !== 'SUPER_ADMIN') {
        return { success: false, error: 'Acceso no autorizado' };
      }
      
      const targetTenantId = config.tenantId;
      const previousState = config.toObject() as unknown as Record<string, unknown>;
      await ExamConfig.findByIdAndUpdate(id, data);
      
      // Log the update event
      await logger.audit({
        tenantId: targetTenantId,
        action: 'EXAM_CONFIG_UPDATED',
        entityType: 'CONFIG',
        entityId: id,
        userId: session.user.id,
        userEmail: session.user.email || 'system@abd.com',
        changedFields: data as Record<string, unknown>,
        previousState,
      });
      
      revalidatePath('/admin/exams');
      revalidatePath('/');
      
      return { success: true };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error updating exam config:', msg);
      return { success: false, error: msg };
    }
  }, explicitCtx);
}

/**
 * Borrado lógico de una configuración
 */
export async function deleteExamConfigAction(id: string, tenantIdParam?: string) {
  const explicitCtx = await resolveTargetTenantContext(tenantIdParam);
  
  return withTenantContext(async () => {
    try {
      await connectDB();
      const session = await getIndustrialSession();
      
      if (!session?.user?.id) return { success: false, error: 'Unauthorized' };
      
      const config = await ExamConfig.findById(id);
      if (!config) {
        return { success: false, error: 'Acceso no autorizado' };
      }

      // Anti-IDOR Guard
      const activeTenantId = explicitCtx?.tenantId || session.user.tenantId;
      if (config.tenantId !== activeTenantId && session.user.role !== 'SUPER_ADMIN') {
        return { success: false, error: 'Acceso no autorizado' };
      }
      
      const targetTenantId = config.tenantId;
      const previousState = config.toObject() as unknown as Record<string, unknown>;
      await ExamConfig.findByIdAndUpdate(id, { active: false });
      
      // Log the deletion event
      await logger.audit({
        tenantId: targetTenantId,
        action: 'EXAM_CONFIG_DELETED',
        entityType: 'CONFIG',
        entityId: id,
        userId: session.user.id,
        userEmail: session.user.email || 'system@abd.com',
        changedFields: { active: false },
        previousState,
      });
      
      revalidatePath('/admin/exams');
      revalidatePath('/');
      
      return { success: true };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error deleting exam config:', msg);
      return { success: false, error: msg };
    }
  }, explicitCtx);
}

/**
 * Clona una configuración de examen existente
 */
export async function cloneExamConfigAction(id: string, tenantIdParam?: string) {
  const explicitCtx = await resolveTargetTenantContext(tenantIdParam);
  
  return withTenantContext(async () => {
    try {
      await connectDB();
      const session = await getIndustrialSession();
      
      if (!session?.user?.id) return { success: false, error: 'Unauthorized' };
      
      const source = await ExamConfig.findById(id).lean();
      if (!source) {
        return { success: false, error: 'Configuración origen no encontrada o acceso no autorizado' };
      }

      // Anti-IDOR Guard
      const activeTenantId = explicitCtx?.tenantId || session.user.tenantId;
      if (source.tenantId !== activeTenantId && session.user.role !== 'SUPER_ADMIN') {
        return { success: false, error: 'Configuración origen no encontrada o acceso no autorizado' };
      }
      
      const targetTenantId = source.tenantId;
      const { _id, createdAt, updatedAt, ...rest } = source as unknown as Record<string, unknown>;
      
      const cloned = await ExamConfig.create({
        ...rest,
        tenantId: targetTenantId,
        name: `${source.name} (Copia)`,
        isDefault: false
      });
      
      // Log the cloning event
      await logger.audit({
        tenantId: targetTenantId,
        action: 'EXAM_CONFIG_CLONED',
        entityType: 'CONFIG',
        entityId: cloned._id.toString(),
        userId: session.user.id,
        userEmail: session.user.email || 'system@abd.com',
        changedFields: {
          sourceId: id,
          name: cloned.name,
        },
      });
      
      revalidatePath('/admin/exams');
      revalidatePath('/');
      
      return { success: true, id: cloned._id.toString() };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error cloning exam config:', msg);
      return { success: false, error: msg };
    }
  }, explicitCtx);
}
