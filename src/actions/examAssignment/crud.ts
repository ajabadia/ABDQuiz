/**
 * @purpose Gestiona la creación, actualización y eliminación de asignaciones de exámenes dentro del contexto de un inquilino.
 * @purpose_en Manages the creation, updating, and deletion of exam assignments within a tenant context.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Business Service
 * @complexity Medium
 * @fingerprint exports:5,imports:7,sig:646g6t
 * @lastUpdated 2026-06-24T10:32:10.012Z
 */

'use server';

import { getIndustrialSession } from '@ajabadia/satellite-sdk/auth-middleware';
import { connectDB, withTenantContext } from '@ajabadia/satellite-sdk/db';
import { logger } from '@ajabadia/satellite-sdk/logger';
import { resolveTargetTenantContext } from '@ajabadia/satellite-sdk/utils';
import ExamConfig from '@/models/ExamConfig';
import ExamAssignment from '@/models/ExamAssignment';
import { revalidatePath } from 'next/cache';
import { auditEntry } from './utils';
import { validateTenantAccess, AssignmentExecutionContext } from './shared';
import type { CreateAssignmentData, UpdateAssignmentData } from './types';

// --- Create ---

export async function createAssignmentAction(data: CreateAssignmentData, tenantIdParam?: string) {
  const explicitCtx = await resolveTargetTenantContext(tenantIdParam);

  return withTenantContext(async () => {
    try {
      const ctx = await AssignmentExecutionContext.create(explicitCtx);

      // Validar que examConfigId existe y pertenece al tenant
      const configExists = await ExamConfig.findOne({
        _id: data.examConfigId,
        tenantId: ctx.activeTenantId,
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
        tenantId: ctx.activeTenantId,
        examConfigId: data.examConfigId,
        assignedToType: data.assignedToType,
        assignedToId: data.assignedToId,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        status: 'draft',
        maxAttempts: data.maxAttempts || 0,
        active: true,
        createdBy: ctx.session.user.id,
        auditTrail: [auditEntry('QUIZ_ASSIGNMENT_CREATE', ctx.session.user.id, ctx.session.user.email || 'system@abd.com', 'Asignación creada')],
      });

      await logger.audit({
        tenantId: ctx.activeTenantId,
        action: 'QUIZ_ASSIGNMENT_CREATE',
        entityType: 'ASSIGNMENT',
        entityId: newAssignment._id.toString(),
        userId: ctx.session.user.id,
        userEmail: ctx.session.user.email || 'system@abd.com',
        changedFields: data as unknown as Record<string, unknown>,
      });

      revalidatePath('/admin/assignments');
      return { success: true, id: newAssignment._id.toString() };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      await logger.audit({
        tenantId: explicitCtx?.tenantId || 'unknown',
        action: 'CREATE_ASSIGNMENT_ERROR',
        entityType: 'ASSIGNMENT',
        entityId: 'unknown',
        userId: 'system',
        userEmail: 'system@abd.com',
        changedFields: { error: msg },
      });
      console.error('❌ Error creating assignment:', msg);
      return { success: false, error: msg };
    }
  }, explicitCtx);
}

// --- Update ---

export async function updateAssignmentAction(id: string, data: UpdateAssignmentData, tenantIdParam?: string) {
  const explicitCtx = await resolveTargetTenantContext(tenantIdParam);

  return withTenantContext(async () => {
    try {
      const ctx = await AssignmentExecutionContext.create(explicitCtx);

      const assignment = await ExamAssignment.findById(id);
      if (!assignment) {
        return { success: false, error: 'Asignación no encontrada' };
      }

      if (!validateTenantAccess(assignment.tenantId, ctx)) {
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
        $push: { auditTrail: auditEntry('QUIZ_ASSIGNMENT_UPDATE', ctx.session.user.id, ctx.session.user.email || 'system@abd.com', `Campos modificados: ${updatedFields}`) },
      });

      await logger.audit({
        tenantId: assignment.tenantId,
        action: 'QUIZ_ASSIGNMENT_UPDATE',
        entityType: 'ASSIGNMENT',
        entityId: id,
        userId: ctx.session.user.id,
        userEmail: ctx.session.user.email || 'system@abd.com',
        changedFields: updateData,
        previousState,
      });

      revalidatePath('/admin/assignments');
      return { success: true };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      await logger.audit({
        tenantId: explicitCtx?.tenantId || 'unknown',
        action: 'UPDATE_ASSIGNMENT_ERROR',
        entityType: 'ASSIGNMENT',
        entityId: id,
        userId: 'system',
        userEmail: 'system@abd.com',
        changedFields: { error: msg },
      });
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
      const ctx = await AssignmentExecutionContext.create(explicitCtx);

      const assignment = await ExamAssignment.findById(id);
      if (!assignment) {
        return { success: false, error: 'Asignación no encontrada' };
      }

      if (!validateTenantAccess(assignment.tenantId, ctx)) {
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
        $push: { auditTrail: auditEntry('QUIZ_ASSIGNMENT_PUBLISHED', ctx.session.user.id, ctx.session.user.email || 'system@abd.com', 'Asignación publicada') },
      });

      await logger.audit({
        tenantId: assignment.tenantId,
        action: 'QUIZ_ASSIGNMENT_PUBLISHED',
        entityType: 'ASSIGNMENT',
        entityId: id,
        userId: ctx.session.user.id,
        userEmail: ctx.session.user.email || 'system@abd.com',
        changedFields: { status: 'published' },
        previousState,
      });

      revalidatePath('/admin/assignments');
      revalidatePath('/');
      return { success: true };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      await logger.audit({
        tenantId: explicitCtx?.tenantId || 'unknown',
        action: 'PUBLISH_ASSIGNMENT_ERROR',
        entityType: 'ASSIGNMENT',
        entityId: id,
        userId: 'system',
        userEmail: 'system@abd.com',
        changedFields: { error: msg },
      });
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
      const ctx = await AssignmentExecutionContext.create(explicitCtx);

      const assignment = await ExamAssignment.findById(id);
      if (!assignment) {
        return { success: false, error: 'Asignación no encontrada' };
      }

      if (!validateTenantAccess(assignment.tenantId, ctx)) {
        return { success: false, error: 'Acceso no autorizado' };
      }

      const previousState = assignment.toObject() as unknown as Record<string, unknown>;
      await ExamAssignment.findByIdAndUpdate(id, {
        $set: { status: 'archived' },
        $push: { auditTrail: auditEntry('QUIZ_ASSIGNMENT_ARCHIVED', ctx.session.user.id, ctx.session.user.email || 'system@abd.com', 'Asignación archivada') },
      });

      await logger.audit({
        tenantId: assignment.tenantId,
        action: 'QUIZ_ASSIGNMENT_UPDATE',
        entityType: 'ASSIGNMENT',
        entityId: id,
        userId: ctx.session.user.id,
        userEmail: ctx.session.user.email || 'system@abd.com',
        changedFields: { status: 'archived' },
        previousState,
      });

      revalidatePath('/admin/assignments');
      return { success: true };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      await logger.audit({
        tenantId: explicitCtx?.tenantId || 'unknown',
        action: 'ARCHIVE_ASSIGNMENT_ERROR',
        entityType: 'ASSIGNMENT',
        entityId: id,
        userId: 'system',
        userEmail: 'system@abd.com',
        changedFields: { error: msg },
      });
      console.error('❌ Error archiving assignment:', msg);
      return { success: false, error: msg };
    }
  }, explicitCtx);
}

// --- Delete (soft) ---

export async function deleteAssignmentAction(id: string, tenantIdParam?: string) {
  const explicitCtx = await resolveTargetTenantContext(tenantIdParam);

  return withTenantContext(async () => {
    try {
      const ctx = await AssignmentExecutionContext.create(explicitCtx);

      const assignment = await ExamAssignment.findById(id);
      if (!assignment) {
        return { success: false, error: 'Asignación no encontrada' };
      }

      if (!validateTenantAccess(assignment.tenantId, ctx)) {
        return { success: false, error: 'Acceso no autorizado' };
      }

      const previousState = assignment.toObject() as unknown as Record<string, unknown>;
      await ExamAssignment.findByIdAndUpdate(id, {
        $set: { active: false },
        $push: { auditTrail: auditEntry('QUIZ_ASSIGNMENT_DELETED', ctx.session.user.id, ctx.session.user.email || 'system@abd.com', 'Asignación eliminada (soft)') },
      });

      await logger.audit({
        tenantId: assignment.tenantId,
        action: 'QUIZ_ASSIGNMENT_UPDATE',
        entityType: 'ASSIGNMENT',
        entityId: id,
        userId: ctx.session.user.id,
        userEmail: ctx.session.user.email || 'system@abd.com',
        changedFields: { active: false },
        previousState,
      });

      revalidatePath('/admin/assignments');
      return { success: true };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      await logger.audit({
        tenantId: explicitCtx?.tenantId || 'unknown',
        action: 'DELETE_ASSIGNMENT_ERROR',
        entityType: 'ASSIGNMENT',
        entityId: id,
        userId: 'system',
        userEmail: 'system@abd.com',
        changedFields: { error: msg },
      });
      console.error('❌ Error deleting assignment:', msg);
      return { success: false, error: msg };
    }
  }, explicitCtx);
}
