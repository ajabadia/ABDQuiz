'use server';

import connectDB from '@/lib/database/mongodb';
import ExamConfig from '@/models/ExamConfig';
import { revalidatePath } from 'next/cache';
import { type IExamConfig } from '@/models/ExamConfig';

const DEFAULT_TENANT = process.env.SINGLE_TENANT_ID || "abd_global";
const FAKE_USER_ID = "admin_001";

/**
 * Recupera todas las configuraciones de examen activas para el tenant
 */
export async function getExamConfigsAction() {
  try {
    await connectDB();
    let configs = await ExamConfig.find({ 
      tenantId: DEFAULT_TENANT,
      active: true 
    }).sort({ createdAt: -1 }).lean();
    
    // Seed default configurations if none exist
    if (configs.length === 0) {
      console.log('🌱 Seeding default exam configurations...');
      const defaultConfigs = [
        {
          tenantId: DEFAULT_TENANT,
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
          isDefault: true,
          createdBy: FAKE_USER_ID,
          active: true
        },
        {
          tenantId: DEFAULT_TENANT,
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
          isDefault: true,
          createdBy: FAKE_USER_ID,
          active: true
        }
      ];
      await ExamConfig.insertMany(defaultConfigs);
      configs = await ExamConfig.find({ 
        tenantId: DEFAULT_TENANT,
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
export async function createExamConfigAction(data: Partial<IExamConfig>) {
  try {
    await connectDB();
    
    const newConfig = await ExamConfig.create({
      ...data,
      tenantId: DEFAULT_TENANT,
      createdBy: FAKE_USER_ID,
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
    
    await ExamConfig.findByIdAndUpdate(id, data);
    
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
    
    await ExamConfig.findByIdAndUpdate(id, { active: false });
    
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
    
    const source = await ExamConfig.findById(id).lean();
    if (!source) return { success: false, error: 'Configuración origen no encontrada' };
    
    const { _id, createdAt, updatedAt, ...rest } = source as unknown as Record<string, unknown>;
    
    const cloned = await ExamConfig.create({
      ...rest,
      name: `${source.name} (Copia)`,
      isDefault: false
    });
    
    revalidatePath('/admin/exams');
    revalidatePath('/');
    
    return { success: true, id: cloned._id.toString() };
  } catch (error: unknown) {
    console.error('❌ Error cloning exam config:', error);
    return { success: false, error: (error as Error).message };
  }
}
