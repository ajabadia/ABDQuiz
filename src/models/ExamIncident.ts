/**
 * @purpose Gestiona un esquema de Mongoose y modelo para administrar incidentes de exámenes, incluyendo mensajes entre estudiantes y profesores.
 * @purpose_en Defines a Mongoose schema and model for managing exam incidents, including messages between students and professors.
 * @refactorable false
 * @classification Type Definition
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:18xsogh
 * @lastUpdated 2026-06-25T09:19:48.636Z
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IExamIncident extends Document {
  attemptId: mongoose.Types.ObjectId;
  tenantId: string;
  studentId: string;
  messages: {
    sender: 'student' | 'professor';
    text: string;
    createdAt: Date;
  }[];
  status: 'open' | 'resolved';
  createdAt: Date;
  updatedAt: Date;
}

const ExamIncidentSchema = new Schema<IExamIncident>({
  attemptId: { type: Schema.Types.ObjectId, ref: 'ExamAttempt', required: true },
  tenantId: { type: String, required: true, index: true },
  studentId: { type: String, required: true },
  messages: [{
    sender: { type: String, enum: ['student', 'professor'], required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  }],
  status: { type: String, enum: ['open', 'resolved'], default: 'open', index: true },
}, { timestamps: true });

ExamIncidentSchema.index({ attemptId: 1, 'messages.createdAt': 1 });
ExamIncidentSchema.index({ tenantId: 1, status: 1 });

import { getTenantModel } from '@ajabadia/satellite-sdk/db';

const ExamIncident = getTenantModel<IExamIncident>('ExamIncident', ExamIncidentSchema);

export default ExamIncident;
