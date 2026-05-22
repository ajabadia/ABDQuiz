'use server';

import connectDB from '@/lib/database/mongodb';
import ExamConfig from '@/models/ExamConfig';
import { revalidatePath } from 'next/cache';
import { type IExamConfig } from '@/models/ExamConfig';
import { getIndustrialSession } from '@/lib/session';
import { LogsClient } from '@/lib/logs-client';
import { withTenantContext } from '@/lib/database/tenant-model';



/**
 * Recupera todas las configuraciones de examen activas para el tenant
 */
export async function getExamConfigsAction(tenantIdParam?: string) {
  return withTenantContext(async () => {
    try {
      await connectDB();
      const session = await getIndustrialSession();
      
      if (!session?.user?.id || !session?.user?.tenantId) {
        throw new Error('Unauthorized');
      }
      
      let activeTenantId = session.user.tenantId;
      if (session.user.role === 'SUPER_ADMIN' && tenantIdParam) {
        activeTenantId = tenantIdParam;
      }

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
      return configs.map((c: any) => ({
        ...c,
        _id: c._id.toString(),
        createdAt: c.createdAt?.toISOString(),
        updatedAt: c.updatedAt?.toISOString()
      }));
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error fetching exam configs:', msg);
      throw new Error(msg); // Do not silence
    }
  });
}

/**
 * Crea una nueva configuración de examen
 */
export async function createExamConfigAction(data: Partial<IExamConfig>, tenantIdParam?: string) {
  return withTenantContext(async () => {
    try {
      await connectDB();
      const session = await getIndustrialSession();
      
      if (!session?.user?.id || !session?.user?.tenantId) {
        return { success: false, error: 'Unauthorized' };
      }
      
      let activeTenantId = session.user.tenantId;
      if (session.user.role === 'SUPER_ADMIN' && tenantIdParam) {
        activeTenantId = tenantIdParam;
      }
      
      const newConfig = await ExamConfig.create({
        ...data,
        tenantId: activeTenantId,
        createdBy: session.user.id,
      });
      
      // Log the creation event
      await LogsClient.log({
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
  });
}

/**
 * Actualiza una configuración existente
 */
export async function updateExamConfigAction(id: string, data: Partial<IExamConfig>) {
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
      if (config.tenantId !== session.user.tenantId && session.user.role !== 'SUPER_ADMIN') {
        return { success: false, error: 'Acceso no autorizado' };
      }
      
      const targetTenantId = config.tenantId;
      const previousState = config.toObject() as unknown as Record<string, unknown>;
      await ExamConfig.findByIdAndUpdate(id, data);
      
      // Log the update event
      await LogsClient.log({
        tenantId: targetTenantId,
        action: 'EXAM_CONFIG_UPDATED',
        entityType: 'CONFIG',
        entityId: id,
        userId: session.user.id,
        userEmail: session.user.email || 'system@abd.com',
        changedFields: data as any,
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
  });
}

/**
 * Borrado lógico de una configuración
 */
export async function deleteExamConfigAction(id: string) {
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
      if (config.tenantId !== session.user.tenantId && session.user.role !== 'SUPER_ADMIN') {
        return { success: false, error: 'Acceso no autorizado' };
      }
      
      const targetTenantId = config.tenantId;
      const previousState = config.toObject() as unknown as Record<string, unknown>;
      await ExamConfig.findByIdAndUpdate(id, { active: false });
      
      // Log the deletion event
      await LogsClient.log({
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
  });
}

/**
 * Clona una configuración de examen existente
 */
export async function cloneExamConfigAction(id: string) {
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
      if (source.tenantId !== session.user.tenantId && session.user.role !== 'SUPER_ADMIN') {
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
      await LogsClient.log({
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
  });
}
