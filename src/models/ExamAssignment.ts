/**
 * @purpose Gestiona el esquema y modelo para asignaciones de exámenes en el proyecto ABDSuite.
 * @purpose_en Manages the schema and model for exam assignments in the ABDSuite project.
 * @refactorable false
 * @classification Type Definition
 * @complexity Low
 * @fingerprint exports:2,imports:2,sig:10fq433
 * @lastUpdated 2026-06-23T19:52:16.347Z
 */

import mongoose, { Schema, Document } from 'mongoose';
import { getTenantModel } from '@ajabadia/satellite-sdk';

export interface IAuditEntry {
  action: string;
  userId: string;
  userEmail: string;
  timestamp: Date;
  details?: string;
}

export interface IExamAssignment extends Document {
  tenantId: string;
  examConfigId: mongoose.Types.ObjectId;
  assignedToType: 'group' | 'user' | 'space';
  assignedToId: string;
  startDate: Date;
  endDate: Date;
  status: 'draft' | 'published' | 'archived';
  maxAttempts: number;
  active: boolean;
  createdBy: string;
  auditTrail: IAuditEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const AuditEntrySchema = new Schema<IAuditEntry>(
  {
    action: { type: String, required: true },
    userId: { type: String, required: true },
    userEmail: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    details: { type: String },
  },
  { _id: false }
);

const ExamAssignmentSchema = new Schema<IExamAssignment>(
  {
    tenantId: { type: String, required: true, index: true },
    examConfigId: { type: Schema.Types.ObjectId, ref: 'ExamConfig', required: true, index: true },
    assignedToType: { type: String, enum: ['group', 'user', 'space'], required: true },
    assignedToId: { type: String, required: true, index: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true },
    maxAttempts: { type: Number, default: 0 },
    active: { type: Boolean, default: true, index: true },
    createdBy: { type: String, required: true },
    auditTrail: { type: [AuditEntrySchema], default: [] },
  },
  { timestamps: true }
);

// Índice compuesto para búsquedas de asignaciones activas por destinatario
ExamAssignmentSchema.index({ tenantId: 1, assignedToId: 1, status: 1 });

const ExamAssignment = getTenantModel<IExamAssignment>('ExamAssignment', ExamAssignmentSchema);

export default ExamAssignment;
