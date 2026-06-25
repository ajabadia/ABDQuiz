/**
 * @purpose Gestiona un esquema de Mongoose y modelo para administrar roles de usuarios dentro de las pruebas, incluyendo inquilino, usuario, escopo, tipo de rol y detalles de asignación.
 * @purpose_en Defines a Mongoose schema and model for managing user roles within quizzes, including tenant, user, scope, role type, and assignment details.
 * @refactorable false
 * @classification Type Definition
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:1ntjxmb
 * @lastUpdated 2026-06-25T09:20:11.665Z
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import { getTenantModel } from '@ajabadia/satellite-sdk/db';

export interface IQuizUserRole extends Document {
  tenantId: string;
  userId: string;
  scopeType: 'space' | 'course' | 'exam_config';
  scopeId: string;
  roleType: 'CREATOR' | 'AUDITOR';
  assignedBy: string;
}

const QuizUserRoleSchema = new Schema<IQuizUserRole>(
  {
    tenantId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    scopeType: {
      type: String,
      required: true,
      enum: ['space', 'course', 'exam_config'],
    },
    scopeId: { type: String, required: true },
    roleType: {
      type: String,
      required: true,
      enum: ['CREATOR', 'AUDITOR'],
    },
    assignedBy: { type: String, required: true },
  },
  {
    timestamps: true,
    collection: 'QuizUserRole',
  }
);

QuizUserRoleSchema.index({ userId: 1, scopeType: 1, scopeId: 1 }, { unique: true });
QuizUserRoleSchema.index({ tenantId: 1, userId: 1, scopeId: 1 });

const QuizUserRole: Model<IQuizUserRole> = getTenantModel<IQuizUserRole>('QuizUserRole', QuizUserRoleSchema);

export default QuizUserRole;
