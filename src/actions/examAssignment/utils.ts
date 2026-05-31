import type { SerializedAuditEntry, SerializedExamAssignment } from './types';

/** Serializa un documento IExamAssignment a objeto plano */
export function serializeAssignment(doc: Record<string, unknown>): SerializedExamAssignment {
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
export function auditEntry(action: string, userId: string, userEmail: string, details?: string) {
  return {
    action,
    userId,
    userEmail,
    timestamp: new Date(),
    details,
  };
}
