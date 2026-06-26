/**
 * @purpose Gestiona el recuperar y serializar asignaciones de examenes activas para un inquilino, aplicando filtros opcionales.
 * @purpose_en Manages the retrieval and serialization of active exam assignments for a tenant, applying optional filters.
 * @refactorable true (contains multiple functions with distinct responsibilities)
 * @classification Business Service
 * @complexity Medium
 * @fingerprint exports:2,imports:8,sig:13wrwcp
 * @lastUpdated 2026-06-26T10:01:10.637Z
 */

'use server';

import { getIndustrialSession } from '@ajabadia/satellite-sdk/auth-middleware';
import { connectDB, withTenantContext } from '@ajabadia/satellite-sdk/db';
import { logger } from '@ajabadia/satellite-sdk/logger';
import { resolveTargetTenantContext } from '@ajabadia/satellite-sdk/utils';
import ExamAssignment from '@/models/ExamAssignment';
import { type SerializedExamConfig } from '@/types/quiz';
import { serializeAssignment } from './utils';
import type { ListAssignmentsFilters } from './types';

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
      await logger.audit({
        tenantId: explicitCtx?.tenantId || 'unknown',
        action: 'LIST_ASSIGNMENTS_ERROR',
        entityType: 'ASSIGNMENT',
        entityId: 'unknown',
        userId: 'system',
        userEmail: 'system@abd.com',
        changedFields: { error: msg },
      });
      console.error('❌ Error listing assignments:', msg);
      throw new Error(msg);
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
      await logger.audit({
        tenantId: explicitCtx?.tenantId || 'unknown',
        action: 'FETCH_AVAILABLE_EXAMS_ERROR',
        entityType: 'ASSIGNMENT',
        entityId: 'unknown',
        userId: 'system',
        userEmail: 'system@abd.com',
        changedFields: { error: msg },
      });
      console.error('❌ Error fetching available exams:', msg);
      throw new Error(msg);
    }
  }, explicitCtx);
}
