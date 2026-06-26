/**
 * @purpose Gestiona configuraciones de exámenes para los inquilinos, incluyendo la recuperación, creación y clonación de configuraciones.
 * @purpose_en Manages exam configurations for tenants, including fetching, creating, and cloning configurations.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Business Service
 * @complexity Medium
 * @fingerprint exports:5,imports:9,sig:1atgmji
 * @lastUpdated 2026-06-26T10:01:20.386Z
 */

'use server';

import { getIndustrialSession } from '@ajabadia/satellite-sdk/auth-middleware';
import { connectDB, withTenantContext } from '@ajabadia/satellite-sdk/db';
import { logger } from '@ajabadia/satellite-sdk/logger';
import { resolveTargetTenantContext } from '@ajabadia/satellite-sdk/utils';
import ExamConfig from '@/models/ExamConfig';
import { revalidatePath } from 'next/cache';
import { type IExamConfig } from '@/models/ExamConfig';

import { type SerializedExamConfig } from '@/types/quiz';
import { seedDefaultConfigs, serializeExamConfig } from './examConfigHelpers';

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
        await seedDefaultConfigs(activeTenantId, session.user.id);
        configs = await ExamConfig.find({ 
          tenantId: activeTenantId,
          active: true 
        }).sort({ createdAt: -1 }).lean();
      }
      
      return configs.map((c) => serializeExamConfig(c as unknown as Record<string, unknown>));
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      await logger.audit({
        tenantId: explicitCtx?.tenantId || 'unknown',
        action: 'FETCH_EXAM_CONFIGS_ERROR',
        entityType: 'CONFIG',
        entityId: 'unknown',
        userId: 'system',
        userEmail: 'system@abd.com',
        changedFields: { error: msg },
      });
      console.error('❌ Error fetching exam configs:', msg);
      throw new Error(msg);
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
      await logger.audit({
        tenantId: explicitCtx?.tenantId || 'unknown',
        action: 'CREATE_EXAM_CONFIG_ERROR',
        entityType: 'CONFIG',
        entityId: 'unknown',
        userId: 'system',
        userEmail: 'system@abd.com',
        changedFields: { error: msg },
      });
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
      await logger.audit({
        tenantId: explicitCtx?.tenantId || 'unknown',
        action: 'UPDATE_EXAM_CONFIG_ERROR',
        entityType: 'CONFIG',
        entityId: id,
        userId: 'system',
        userEmail: 'system@abd.com',
        changedFields: { error: msg },
      });
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
      await logger.audit({
        tenantId: explicitCtx?.tenantId || 'unknown',
        action: 'DELETE_EXAM_CONFIG_ERROR',
        entityType: 'CONFIG',
        entityId: id,
        userId: 'system',
        userEmail: 'system@abd.com',
        changedFields: { error: msg },
      });
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
      await logger.audit({
        tenantId: explicitCtx?.tenantId || 'unknown',
        action: 'CLONE_EXAM_CONFIG_ERROR',
        entityType: 'CONFIG',
        entityId: id,
        userId: 'system',
        userEmail: 'system@abd.com',
        changedFields: { error: msg },
      });
      console.error('❌ Error cloning exam config:', msg);
      return { success: false, error: msg };
    }
  }, explicitCtx);
}
