/**
 * @purpose Gestiona mensajes de incidente y estados de intentos de exámenes.
 * @purpose_en Manages incident messages and statuses for exam attempts.
 * @refactorable true (contains multiple actions and business logic)
 * @classification Business Service
 * @complexity Medium
 * @fingerprint exports:5,imports:6,sig:echg31
 * @lastUpdated 2026-06-25T09:18:30.480Z
 */

'use server';

import { getIndustrialSession } from '@ajabadia/satellite-sdk/auth-middleware';
import { connectDB, withTenantContext } from '@ajabadia/satellite-sdk/db';
import { logger } from '@ajabadia/satellite-sdk/logger';
import { resolveTargetTenantContext } from '@ajabadia/satellite-sdk/utils';
import ExamIncident, { type IExamIncident } from '@/models/ExamIncident';
import { revalidatePath } from 'next/cache';

function serializeMessage(m: { sender: string; text: string; createdAt: Date }) {
  return {
    sender: m.sender as 'student' | 'professor',
    text: m.text,
    createdAt: m.createdAt.toISOString(),
  };
}

export async function getIncidentMessagesAction(
  attemptId: string,
  since?: string,
  tenantIdParam?: string
) {
  const explicitCtx = await resolveTargetTenantContext(tenantIdParam);

  return withTenantContext(async () => {
    try {
      await connectDB();
      const session = await getIndustrialSession();
      if (!session?.user?.id) throw new Error('Unauthorized');

      const query: Record<string, unknown> = { attemptId };
      const incident = await ExamIncident.findOne(query).lean() as IExamIncident | null;
      if (!incident) return { success: true, messages: [], incidentId: null };

      let filtered = incident.messages;
      if (since) {
        const sinceDate = new Date(since);
        filtered = filtered.filter(m => m.createdAt > sinceDate);
      }

      return {
        success: true,
        messages: filtered.map(serializeMessage),
        incidentId: incident._id.toString(),
        status: incident.status,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[getIncidentMessagesAction]', msg);
      return { success: false, error: msg };
    }
  }, explicitCtx);
}

export async function sendIncidentMessageAction(
  attemptId: string,
  text: string,
  tenantIdParam?: string
) {
  const explicitCtx = await resolveTargetTenantContext(tenantIdParam);

  return withTenantContext(async () => {
    try {
      await connectDB();
      const session = await getIndustrialSession();
      if (!session?.user?.id || !session?.user?.tenantId) throw new Error('Unauthorized');

      if (!text.trim()) return { success: false, error: 'El mensaje no puede estar vacío' };

      const activeTenantId = explicitCtx?.tenantId || session.user.tenantId;
      const sender: 'student' | 'professor' = session.user.role === 'PROFESSOR' || session.user.role === 'ADMIN' ? 'professor' : 'student';

      let incident = await ExamIncident.findOne({ attemptId });

      if (!incident) {
        incident = await ExamIncident.create({
          attemptId,
          tenantId: activeTenantId,
          studentId: sender === 'student' ? session.user.id : '',
          messages: [],
          status: 'open',
        });
      }

      incident.messages.push({
        sender,
        text: text.trim(),
        createdAt: new Date(),
      });

      if (incident.status === 'resolved') {
        incident.status = 'open';
      }

      await incident.save();

      await logger.audit({
        appId: 'ABDQuiz',
        tenantId: activeTenantId,
        action: 'INCIDENT_MESSAGE_SENT',
        entityType: 'INCIDENT',
        entityId: incident._id.toString(),
        userId: session.user.id,
        userEmail: session.user.email || '',
        changedFields: { attemptId, sender },
      });

      revalidatePath('/');
      return { success: true };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[sendIncidentMessageAction]', msg);
      return { success: false, error: msg };
    }
  }, explicitCtx);
}

export async function getOpenIncidentsCountAction(tenantIdParam?: string) {
  const explicitCtx = await resolveTargetTenantContext(tenantIdParam);

  return withTenantContext(async () => {
    try {
      await connectDB();
      const session = await getIndustrialSession();
      if (!session?.user?.id || !session?.user?.tenantId) throw new Error('Unauthorized');

      const activeTenantId = explicitCtx?.tenantId || session.user.tenantId;
      const count = await ExamIncident.countDocuments({ tenantId: activeTenantId, status: 'open' });

      return { success: true, count };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[getOpenIncidentsCountAction]', msg);
      return { success: false, error: msg, count: 0 };
    }
  }, explicitCtx);
}

export async function listOpenIncidentsAction(tenantIdParam?: string) {
  const explicitCtx = await resolveTargetTenantContext(tenantIdParam);

  return withTenantContext(async () => {
    try {
      await connectDB();
      const session = await getIndustrialSession();
      if (!session?.user?.id || !session?.user?.tenantId) throw new Error('Unauthorized');

      const role = session.user.role;
      if (role !== 'ADMIN' && role !== 'PROFESSOR' && role !== 'SUPER_ADMIN') {
        throw new Error('Acceso no autorizado');
      }

      const activeTenantId = explicitCtx?.tenantId || session.user.tenantId;
      const incidents = await ExamIncident.find({ tenantId: activeTenantId })
        .sort({ updatedAt: -1 })
        .lean() as IExamIncident[];

      return {
        success: true,
        data: incidents.map((inc) => ({
          _id: (inc._id as { toString(): string }).toString(),
          attemptId: (inc.attemptId as unknown as { toString(): string }).toString(),
          studentId: inc.studentId,
          status: inc.status,
          messageCount: inc.messages.length,
          lastMessage: inc.messages.length > 0
            ? { text: inc.messages[inc.messages.length - 1].text, sender: inc.messages[inc.messages.length - 1].sender, createdAt: inc.messages[inc.messages.length - 1].createdAt.toISOString() }
            : null,
          createdAt: inc.createdAt.toISOString(),
          updatedAt: inc.updatedAt.toISOString(),
        })),
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[listOpenIncidentsAction]', msg);
      return { success: false, error: msg };
    }
  }, explicitCtx);
}

export async function resolveIncidentAction(incidentId: string, tenantIdParam?: string) {
  const explicitCtx = await resolveTargetTenantContext(tenantIdParam);

  return withTenantContext(async () => {
    try {
      await connectDB();
      const session = await getIndustrialSession();
      if (!session?.user?.id) throw new Error('Unauthorized');

      const role = session.user.role;
      if (role !== 'ADMIN' && role !== 'PROFESSOR') {
        throw new Error('Solo administradores o profesores pueden resolver incidentes');
      }

      const incident = await ExamIncident.findByIdAndUpdate(
        incidentId,
        { status: 'resolved' },
        { new: true }
      );

      if (!incident) return { success: false, error: 'Incidente no encontrado' };

      await logger.audit({
        appId: 'ABDQuiz',
        tenantId: incident.tenantId,
        action: 'INCIDENT_RESOLVED',
        entityType: 'INCIDENT',
        entityId: incidentId,
        userId: session.user.id,
        userEmail: session.user.email || '',
        changedFields: { status: 'resolved' },
      });

      revalidatePath('/');
      return { success: true };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[resolveIncidentAction]', msg);
      return { success: false, error: msg };
    }
  }, explicitCtx);
}
