/**
 * @purpose Gestiona un esquema de Mongoose y modelo para denuncias en la aplicación ABDQuiz, incluyendo campos para identificador del inquilino, detalles del usuario, intento de examen, información de pregunta, estado de resolución y fechas.
 * @purpose_en Defines a Mongoose schema and model for allegations in the ABDQuiz application, including fields for tenant ID, user details, exam attempt, question information, resolution status, and timestamps.
 * @refactorable false
 * @classification Type Definition
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:1s24ywq
 * @lastUpdated 2026-06-23T19:51:53.315Z
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAllegation extends Document {
  tenantId: string;
  userId: string;
  userEmail: string;
  userName: string;
  examAttemptId: mongoose.Types.ObjectId;
  questionId: mongoose.Types.ObjectId;
  questionText: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  resolution?: 'CORRECTION_SHIFT' | 'CANCEL_QUESTION' | 'GIVE_POINTS_TO_ALL';
  resolvedBy?: string;
  resolvedAt?: Date;
  feedback?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AllegationSchema = new Schema<IAllegation>({
  tenantId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  userEmail: { type: String, required: true },
  userName: { type: String, required: true },
  examAttemptId: { type: Schema.Types.ObjectId, ref: 'ExamAttempt', required: true, index: true },
  questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true, index: true },
  questionText: { type: String, required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  resolution: { type: String, enum: ['CORRECTION_SHIFT', 'CANCEL_QUESTION', 'GIVE_POINTS_TO_ALL'] },
  resolvedBy: { type: String },
  resolvedAt: { type: Date },
  feedback: { type: String, default: "" }
}, {
  timestamps: true
});

import { getTenantModel } from '@ajabadia/satellite-sdk/db';

const Allegation: Model<IAllegation> = getTenantModel<IAllegation>('Allegation', AllegationSchema);

export default Allegation;
