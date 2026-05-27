'use server';

import connectDB from '@/lib/database/mongodb';
import ExamConfig from '@/models/ExamConfig';
import ExamAssignment from '@/models/ExamAssignment';
import { revalidatePath } from 'next/cache';
import { getIndustrialSession } from '@/lib/session';
import { type SerializedExamConfig } from '@/types/quiz';
import { LogsClient } from '@/lib/logs-client';
import { withTenantContext } from '@/lib/database/tenant-model';
import { resolveTargetTenantContext } from '@/lib/tenant-resolver';

// --- Tipos serializados ---

export interface SerializedAuditEntry {
  action: string;
  userId: string;
  userEmail: string;
  timestamp: string;
  details?: string;
}

export interface SerializedExamAssignment {
  _id: string;
  tenantId: string;
  examConfigId: string;
  examConfigName: string;
  assignedToType: 'group' | 'user' | 'space';
  assignedToId: string;
  startDate: string;
  endDate: string;
  status: 'draft' | 'published' | 'archived';
  maxAttempts: number;
  active: boolean;
  createdBy: string;
  auditTrail: SerializedAuditEntry[];
  createdAt: string;
  updatedAt: string;
}

/** Serializa un documento IExamAssignment a objeto plano */
function serializeAssignment(doc: Record<string, unknown>): SerializedExamAssignment {
  const rawTrail = doc.auditTrail as Record<string, unknown>[] | undefined;
  return {
    _id: (doc._id as { toString(): string }).toString(),
    tenantId: doc.tenantId as string,
    examConfigId: (typeof doc.examConfigId === 'object' && doc.examConfigId !== null
      ? (doc.examConfigId as { _id: { toString(): string } })._id?.toString()
      : (doc.examConfigId as { toString(): string })?.toString()) || '',
    examConfigName: (typeof doc.examConfigId === 'object' && doc.examConfigId !== null
      ? (doc.examConfigId as { name?: string }).name || ''
      : '') || '',
    assignedToType: doc.assignedToType as 'group' | 'user' | 'space',
    assignedToId: doc.assignedToId as string,
    startDate: (doc.startDate as Date)?.toISOString() || '',
    endDate: (doc.endDate as Date)?.toISOString() || '',
    status: doc.status as 'draft' | 'published' | 'archived',
    maxAttempts: (doc.maxAttempts as number) || 0,
    active: doc.active as boolean,
    createdBy: doc.createdBy as string,
    auditTrail: (rawTrail || []).map((e) => ({
      action: e.action as string,
      userId: e.userId as string,
      userEmail: e.userEmail as string,
      timestamp: (e.timestamp as Date)?.toISOString() || '',
      details: e.details as string | undefined,
    })),
    createdAt: (doc.createdAt as Date)?.toISOString() || '',
    updatedAt: (doc.updatedAt as Date)?.toISOString() || '',
  };
}

/** Helper para crear una entrada de auditoría */
function auditEntry(action: string, userId: string, userEmail: string, details?: string) {
  return {
    action,
    userId,
    userEmail,
    timestamp: new Date(),
    details,
  };
}

// --- List ---

export interface ListAssignmentsFilters {
  status?: 'draft' | 'published' | 'archived';
  examConfigId?: string;
  assignedToId?: string;
}

/**
 * Lista todas las asignaciones activas del tenant, con filtros opcionales.
 */
export async function listAssignmentsAction(filters?: ListAssignmentsFilters, tenantIdParam?: string) {
  const explicitCtx = await resolveTargetTenantContext(tenantIdParam);
  
  return withTenantContext(async () => {
    try {
      await connectDB();
      const session = await getIndustrialSession();

      if (!session?.user?.id || !session?.user?.tenantId) {
        throw new Error('Unauthorized');
      }

      const activeTenantId = explicitCtx?.tenantId || session.user.tenantId;

      const query: Record<string, unknown> = { tenantId: activeTenantId, active: true };

      if (filters?.status) query.status = filters.status;
      if (filters?.examConfigId) query.examConfigId = filters.examConfigId;
      if (filters?.assignedToId) query.assignedToId = filters.assignedToId;

      const docs = await ExamAssignment.find(query)
        .populate('examConfigId', 'name')
        .sort({ createdAt: -1 })
        .lean();

      return docs.map((d) => serializeAssignment(d as unknown as Record<string, unknown>));
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error listing assignments:', msg);
      throw new Error(msg);
    }
  }, explicitCtx);
}

// --- Create ---

export async function createAssignmentAction(data: {
  examConfigId: string;
  assignedToType: 'group' | 'user' | 'space';
  assignedToId: string;
  startDate: string;
  endDate: string;
  maxAttempts?: number;
}, tenantIdParam?: string) {
  const explicitCtx = await resolveTargetTenantContext(tenantIdParam);
  
  return withTenantContext(async () => {
    try {
      await connectDB();
      const session = await getIndustrialSession();

      if (!session?.user?.id || !session?.user?.tenantId) {
        return { success: false, error: 'Unauthorized' };
      }

      const activeTenantId = explicitCtx?.tenantId || session.user.tenantId;

      // Validar que examConfigId existe y pertenece al tenant
      const configExists = await ExamConfig.findOne({
        _id: data.examConfigId,
        tenantId: activeTenantId,
        active: true,
      });
      if (!configExists) {
        return { success: false, error: 'La configuración de examen no existe o no está activa' };
      }

      // Validar que endDate > startDate
      if (new Date(data.endDate) <= new Date(data.startDate)) {
        return { success: false, error: 'La fecha de fin debe ser posterior a la fecha de inicio' };
      }

      const newAssignment = await ExamAssignment.create({
        tenantId: activeTenantId,
        examConfigId: data.examConfigId,
        assignedToType: data.assignedToType,
        assignedToId: data.assignedToId,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        status: 'draft',
        maxAttempts: data.maxAttempts || 0,
        active: true,
        createdBy: session.user.id,
        auditTrail: [auditEntry('QUIZ_ASSIGNMENT_CREATE', session.user.id, session.user.email || 'system@abd.com', 'Asignación creada')],
      });

      await LogsClient.log({
        tenantId: activeTenantId,
        action: 'QUIZ_ASSIGNMENT_CREATE',
        entityType: 'ASSIGNMENT',
        entityId: newAssignment._id.toString(),
        userId: session.user.id,
        userEmail: session.user.email || 'system@abd.com',
        changedFields: data as unknown as Record<string, unknown>,
      });

      revalidatePath('/admin/assignments');
      return { success: true, id: newAssignment._id.toString() };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error creating assignment:', msg);
      return { success: false, error: msg };
    }
  }, explicitCtx);
}

// --- Update ---

export async function updateAssignmentAction(id: string, data: {
  examConfigId?: string;
  assignedToType?: 'group' | 'user' | 'space';
  assignedToId?: string;
  startDate?: string;
  endDate?: string;
  maxAttempts?: number;
}, tenantIdParam?: string) {
  const explicitCtx = await resolveTargetTenantContext(tenantIdParam);
  
  return withTenantContext(async () => {
    try {
      await connectDB();
      const session = await getIndustrialSession();

      if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

      const assignment = await ExamAssignment.findById(id);
      if (!assignment) {
        return { success: false, error: 'Asignación no encontrada' };
      }

      const activeTenantId = explicitCtx?.tenantId || session.user.tenantId;
      if (assignment.tenantId !== activeTenantId && session.user.role !== 'SUPER_ADMIN') {
        return { success: false, error: 'Acceso no autorizado' };
      }

      // --- Validación de campos bloqueados en asignaciones publicadas ---
      if (assignment.status === 'published') {
        const lockedFields: string[] = [];
        if (data.examConfigId && data.examConfigId !== assignment.examConfigId.toString()) {
          lockedFields.push('examen');
        }
        if (data.assignedToType && data.assignedToType !== assignment.assignedToType) {
          lockedFields.push('tipo de destinatario');
        }
        if (data.assignedToId && data.assignedToId !== assignment.assignedToId) {
          lockedFields.push('destinatario');
        }
        if (lockedFields.length > 0) {
          return { success: false, error: `No se puede modificar ${lockedFields.join(', ')} porque la asignación ya está publicada` };
        }
      }

      const updateData: Record<string, unknown> = {};
      if (data.examConfigId) updateData.examConfigId = data.examConfigId;
      if (data.assignedToType) updateData.assignedToType = data.assignedToType;
      if (data.assignedToId) updateData.assignedToId = data.assignedToId;
      if (data.startDate) updateData.startDate = new Date(data.startDate);
      if (data.endDate) updateData.endDate = new Date(data.endDate);
      if (data.maxAttempts !== undefined) updateData.maxAttempts = data.maxAttempts;

      // Si se cambia el status a 'published', validar fechas
      if (data.startDate || data.endDate) {
        const newStart = data.startDate ? new Date(data.startDate) : assignment.startDate;
        const newEnd = data.endDate ? new Date(data.endDate) : assignment.endDate;
        if (newEnd <= newStart) {
          return { success: false, error: 'La fecha de fin debe ser posterior a la fecha de inicio' };
        }
      }

      const previousState = assignment.toObject() as unknown as Record<string, unknown>;
      const updatedFields = Object.keys(updateData).join(', ');
      await ExamAssignment.findByIdAndUpdate(id, {
        $set: updateData,
        $push: { auditTrail: auditEntry('QUIZ_ASSIGNMENT_UPDATE', session.user.id, session.user.email || 'system@abd.com', `Campos modificados: ${updatedFields}`) },
      });

      await LogsClient.log({
        tenantId: assignment.tenantId,
        action: 'QUIZ_ASSIGNMENT_UPDATE',
        entityType: 'ASSIGNMENT',
        entityId: id,
        userId: session.user.id,
        userEmail: session.user.email || 'system@abd.com',
        changedFields: updateData,
        previousState,
      });

      revalidatePath('/admin/assignments');
      return { success: true };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error updating assignment:', msg);
      return { success: false, error: msg };
    }
  }, explicitCtx);
}

// --- Publish ---

export async function publishAssignmentAction(id: string, tenantIdParam?: string) {
  const explicitCtx = await resolveTargetTenantContext(tenantIdParam);
  
  return withTenantContext(async () => {
    try {
      await connectDB();
      const session = await getIndustrialSession();

      if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

      const assignment = await ExamAssignment.findById(id);
      if (!assignment) {
        return { success: false, error: 'Asignación no encontrada' };
      }

      const activeTenantId = explicitCtx?.tenantId || session.user.tenantId;
      if (assignment.tenantId !== activeTenantId && session.user.role !== 'SUPER_ADMIN') {
        return { success: false, error: 'Acceso no autorizado' };
      }

      if (assignment.status === 'archived') {
        return { success: false, error: 'No se puede publicar una asignación archivada' };
      }

      // Validar que endDate > startDate antes de publicar
      if (assignment.endDate <= assignment.startDate) {
        return { success: false, error: 'La fecha de fin debe ser posterior a la fecha de inicio' };
      }

      const previousState = assignment.toObject() as unknown as Record<string, unknown>;
      await ExamAssignment.findByIdAndUpdate(id, {
        $set: { status: 'published' },
        $push: { auditTrail: auditEntry('QUIZ_ASSIGNMENT_PUBLISHED', session.user.id, session.user.email || 'system@abd.com', 'Asignación publicada') },
      });

      await LogsClient.log({
        tenantId: assignment.tenantId,
        action: 'QUIZ_ASSIGNMENT_PUBLISHED',
        entityType: 'ASSIGNMENT',
        entityId: id,
        userId: session.user.id,
        userEmail: session.user.email || 'system@abd.com',
        changedFields: { status: 'published' },
        previousState,
      });

      revalidatePath('/admin/assignments');
      revalidatePath('/'); // Para actualizar home si muestra exámenes disponibles
      return { success: true };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error publishing assignment:', msg);
      return { success: false, error: msg };
    }
  }, explicitCtx);
}

// --- Archive ---

export async function archiveAssignmentAction(id: string, tenantIdParam?: string) {
  const explicitCtx = await resolveTargetTenantContext(tenantIdParam);
  
  return withTenantContext(async () => {
    try {
      await connectDB();
      const session = await getIndustrialSession();

      if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

      const assignment = await ExamAssignment.findById(id);
      if (!assignment) {
        return { success: false, error: 'Asignación no encontrada' };
      }

      const activeTenantId = explicitCtx?.tenantId || session.user.tenantId;
      if (assignment.tenantId !== activeTenantId && session.user.role !== 'SUPER_ADMIN') {
        return { success: false, error: 'Acceso no autorizado' };
      }

      const previousState = assignment.toObject() as unknown as Record<string, unknown>;
      await ExamAssignment.findByIdAndUpdate(id, {
        $set: { status: 'archived' },
        $push: { auditTrail: auditEntry('QUIZ_ASSIGNMENT_ARCHIVED', session.user.id, session.user.email || 'system@abd.com', 'Asignación archivada') },
      });

      await LogsClient.log({
        tenantId: assignment.tenantId,
        action: 'QUIZ_ASSIGNMENT_UPDATE',
        entityType: 'ASSIGNMENT',
        entityId: id,
        userId: session.user.id,
        userEmail: session.user.email || 'system@abd.com',
        changedFields: { status: 'archived' },
        previousState,
      });

      revalidatePath('/admin/assignments');
      return { success: true };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error archiving assignment:', msg);
      return { success: false, error: msg };
    }
  }, explicitCtx);
}

/**
 * Retorna las configuraciones de examen que tienen asignaciones activas y vigentes.
 * Un usuario final (RECIPIENT) solo ve exámenes que tienen un ExamAssignment
 * con status=published y la fecha actual dentro del rango [startDate, endDate].
 */
export async function getAvailableExamsAction(tenantIdParam?: string, _userId?: string) {
  const explicitCtx = await resolveTargetTenantContext(tenantIdParam);
  
  return withTenantContext(async () => {
    try {
      await connectDB();
      const session = await getIndustrialSession();

      if (!session?.user?.id || !session?.user?.tenantId) {
        throw new Error('Unauthorized');
      }

      const activeTenantId = explicitCtx?.tenantId || session.user.tenantId;

      const now = new Date();

      // Buscar asignaciones publicadas y vigentes
      const assignments = await ExamAssignment.find({
        tenantId: activeTenantId,
        status: 'published',
        active: true,
        startDate: { $lte: now },
        endDate: { $gte: now },
      })
        .populate('examConfigId')
        .lean();

      // Extraer configs únicos (puede haber múltiples assignments para un mismo config)
      const configMap = new Map<string, SerializedExamConfig>();
      for (const a of assignments) {
        const config = a.examConfigId as unknown as Record<string, unknown>;
        if (config && config._id) {
          const id = (config._id as { toString(): string }).toString();
          if (!configMap.has(id) && config.active === true) {
            // Spread del doc completo + serialización de campos que cambian de tipo
            const doc = {
              ...config,
              _id: id,
              createdAt: (config.createdAt as Date | undefined)?.toISOString() || '',
              updatedAt: (config.updatedAt as Date | undefined)?.toISOString() || '',
            } as unknown as SerializedExamConfig;
            configMap.set(id, doc);
          }
        }
      }

      return Array.from(configMap.values());
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error fetching available exams:', msg);
      throw new Error(msg);
    }
  }, explicitCtx);
}

// --- Delete (soft) ---

export async function deleteAssignmentAction(id: string, tenantIdParam?: string) {
  const explicitCtx = await resolveTargetTenantContext(tenantIdParam);
  
  return withTenantContext(async () => {
    try {
      await connectDB();
      const session = await getIndustrialSession();

      if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

      const assignment = await ExamAssignment.findById(id);
      if (!assignment) {
        return { success: false, error: 'Asignación no encontrada' };
      }

      const activeTenantId = explicitCtx?.tenantId || session.user.tenantId;
      if (assignment.tenantId !== activeTenantId && session.user.role !== 'SUPER_ADMIN') {
        return { success: false, error: 'Acceso no autorizado' };
      }

      const previousState = assignment.toObject() as unknown as Record<string, unknown>;
      await ExamAssignment.findByIdAndUpdate(id, {
        $set: { active: false },
        $push: { auditTrail: auditEntry('QUIZ_ASSIGNMENT_DELETED', session.user.id, session.user.email || 'system@abd.com', 'Asignación eliminada (soft)') },
      });

      await LogsClient.log({
        tenantId: assignment.tenantId,
        action: 'QUIZ_ASSIGNMENT_UPDATE',
        entityType: 'ASSIGNMENT',
        entityId: id,
        userId: session.user.id,
        userEmail: session.user.email || 'system@abd.com',
        changedFields: { active: false },
        previousState,
      });

      revalidatePath('/admin/assignments');
      return { success: true };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error deleting assignment:', msg);
      return { success: false, error: msg };
    }
  }, explicitCtx);
}
