import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IQuizUserRole extends Document {
  tenantId: string;
  userId: string;
  scopeType: 'space' | 'course';
  scopeId: string; // ID de Space (ABDtenantGobernance) o ID de Course (local)
  roleType: 'CREATOR' | 'PROFESSOR' | 'RECIPIENT' | 'AUDITOR';
  createdAt: Date;
  updatedAt: Date;
}

const QuizUserRoleSchema = new Schema<IQuizUserRole>(
  {
    tenantId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    scopeType: { type: String, enum: ['space', 'course'], required: true },
    scopeId: { type: String, required: true },
    roleType: { type: String, enum: ['CREATOR', 'PROFESSOR', 'RECIPIENT', 'AUDITOR'], required: true }
  },
  { timestamps: true }
);

// Índice compuesto para evitar duplicidades de rol en un mismo scope
QuizUserRoleSchema.index({ userId: 1, scopeType: 1, scopeId: 1 }, { unique: true });

// Índice de rendimiento para queries frecuentes de requireQuizScope
QuizUserRoleSchema.index({ tenantId: 1, userId: 1, scopeId: 1 });

import { getTenantModel } from '@/lib/database/tenant-model';

const QuizUserRole: Model<IQuizUserRole> = getTenantModel<IQuizUserRole>('QuizUserRole', QuizUserRoleSchema);

export default QuizUserRole;
