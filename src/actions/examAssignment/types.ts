import type { SerializedExamConfig } from '@/types/quiz';

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

export interface ListAssignmentsFilters {
  status?: 'draft' | 'published' | 'archived';
  examConfigId?: string;
  assignedToId?: string;
}

export interface CreateAssignmentData {
  examConfigId: string;
  assignedToType: 'group' | 'user' | 'space';
  assignedToId: string;
  startDate: string;
  endDate: string;
  maxAttempts?: number;
}

export interface UpdateAssignmentData {
  examConfigId?: string;
  assignedToType?: 'group' | 'user' | 'space';
  assignedToId?: string;
  startDate?: string;
  endDate?: string;
  maxAttempts?: number;
}
