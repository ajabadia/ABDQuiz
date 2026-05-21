'use server';

import connectDB from '@/lib/database/mongodb';
import ExamConfig from '@/models/ExamConfig';
import { revalidatePath } from 'next/cache';
import { type IExamConfig } from '@/models/ExamConfig';
import { getIndustrialSession } from '@/lib/session';
import { LogsClient } from '@/lib/logs-client';

const DEFAULT_TENANT = process.env.SINGLE_TENANT_ID || "abd_global";
const FAKE_USER_ID = "admin_001";

/**
 * Recupera todas las configuraciones de examen activas para el tenant
 */
export async function getExamConfigsAction(tenantIdParam?: string) {
  try {
    await connectDB();
    const session = await getIndustrialSession();
    
    // Anti-IDOR Guard
    let activeTenantId = session.user?.tenantId || DEFAULT_TENANT;
    if (session.user?.role === 'SUPER_ADMIN' && tenantIdParam) {
      activeTenantId = tenantIdParam;
    }

    let configs = await ExamConfig.find({ 
      tenantId: activeTenantId,
      active: true 
    }).sort({ createdAt: -1 }).lean();
    
    // Seed default configurations if none exist
    if (configs.length === 0) {
      console.log(`🌱 Seeding default exam configurations for tenant: ${activeTenantId}...`);
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
          createdBy: FAKE_USER_ID,
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
          createdBy: FAKE_USER_ID,
          active: true
        }
      ];
      await ExamConfig.insertMany(defaultConfigs);
      configs = await ExamConfig.find({ 
        tenantId: activeTenantId,
        active: true 
      }).sort({ createdAt: -1 }).lean();
    }
    
    return JSON.parse(JSON.stringify(configs));
  } catch (error) {
    console.error('❌ Error fetching exam configs:', error);
    return [];
  }
}

/**
 * Crea una nueva configuración de examen
 */
export async function createExamConfigAction(data: Partial<IExamConfig>, tenantIdParam?: string) {
  try {
    await connectDB();
    const session = await getIndustrialSession();
    
    // Anti-IDOR Guard
    let activeTenantId = session.user?.tenantId || DEFAULT_TENANT;
    if (session.user?.role === 'SUPER_ADMIN' && tenantIdParam) {
      activeTenantId = tenantIdParam;
    }
    
    const newConfig = await ExamConfig.create({
      ...data,
      tenantId: activeTenantId,
      createdBy: FAKE_USER_ID,
    });
    
    // Log the creation event
    await LogsClient.log({
      tenantId: activeTenantId,
      action: 'EXAM_CONFIG_CREATED',
      entityType: 'CONFIG',
      entityId: newConfig._id.toString(),
      userId: session.user?.id || FAKE_USER_ID,
      userEmail: session.user?.email || 'system@abd.com',
      changedFields: JSON.parse(JSON.stringify(newConfig)),
    });
    
    revalidatePath('/admin/exams');
    revalidatePath('/'); // Para actualizar la home si muestra configs dinámicas
    
    return { success: true, id: newConfig._id.toString() };
  } catch (error: unknown) {
    console.error('❌ Error creating exam config:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Actualiza una configuración existente
 */
export async function updateExamConfigAction(id: string, data: Partial<IExamConfig>) {
  try {
    await connectDB();
    const session = await getIndustrialSession();
    
    const config = await ExamConfig.findById(id);
    if (!config) {
      return { success: false, error: 'Acceso no autorizado' };
    }

    // Anti-IDOR Guard
    if (config.tenantId !== session.user?.tenantId && session.user?.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Acceso no autorizado' };
    }
    
    const targetTenantId = config.tenantId;
    const previousState = JSON.parse(JSON.stringify(config));
    await ExamConfig.findByIdAndUpdate(id, data);
    
    // Log the update event
    await LogsClient.log({
      tenantId: targetTenantId,
      action: 'EXAM_CONFIG_UPDATED',
      entityType: 'CONFIG',
      entityId: id,
      userId: session.user?.id || FAKE_USER_ID,
      userEmail: session.user?.email || 'system@abd.com',
      changedFields: JSON.parse(JSON.stringify(data)),
      previousState,
    });
    
    revalidatePath('/admin/exams');
    revalidatePath('/');
    
    return { success: true };
  } catch (error: unknown) {
    console.error('❌ Error updating exam config:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Borrado lógico de una configuración
 */
export async function deleteExamConfigAction(id: string) {
  try {
    await connectDB();
    const session = await getIndustrialSession();
    
    const config = await ExamConfig.findById(id);
    if (!config) {
      return { success: false, error: 'Acceso no autorizado' };
    }

    // Anti-IDOR Guard
    if (config.tenantId !== session.user?.tenantId && session.user?.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Acceso no autorizado' };
    }
    
    const targetTenantId = config.tenantId;
    const previousState = JSON.parse(JSON.stringify(config));
    await ExamConfig.findByIdAndUpdate(id, { active: false });
    
    // Log the deletion event
    await LogsClient.log({
      tenantId: targetTenantId,
      action: 'EXAM_CONFIG_DELETED',
      entityType: 'CONFIG',
      entityId: id,
      userId: session.user?.id || FAKE_USER_ID,
      userEmail: session.user?.email || 'system@abd.com',
      changedFields: { active: false },
      previousState,
    });
    
    revalidatePath('/admin/exams');
    revalidatePath('/');
    
    return { success: true };
  } catch (error: unknown) {
    console.error('❌ Error deleting exam config:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Clona una configuración de examen existente
 */
export async function cloneExamConfigAction(id: string) {
  try {
    await connectDB();
    const session = await getIndustrialSession();
    
    const source = await ExamConfig.findById(id).lean();
    if (!source) {
      return { success: false, error: 'Configuración origen no encontrada o acceso no autorizado' };
    }

    // Anti-IDOR Guard
    if (source.tenantId !== session.user?.tenantId && session.user?.role !== 'SUPER_ADMIN') {
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
      userId: session.user?.id || FAKE_USER_ID,
      userEmail: session.user?.email || 'system@abd.com',
      changedFields: {
        sourceId: id,
        name: cloned.name,
      },
    });
    
    revalidatePath('/admin/exams');
    revalidatePath('/');
    
    return { success: true, id: cloned._id.toString() };
  } catch (error: unknown) {
    console.error('❌ Error cloning exam config:', error);
    return { success: false, error: (error as Error).message };
  }
}
