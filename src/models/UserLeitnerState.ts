/**
 * @purpose Gestiona el esquema y modelo de Mongoose para administrar el progreso de revisión Leitner de los estudiantes en una base de datos MongoDB.
 * @purpose_en Defines a Mongoose schema and model for managing the Leitner review progress of students in a MongoDB database.
 * @refactorable false
 * @classification Type Definition
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:18qb5d5
 * @lastUpdated 2026-06-23T23:23:24.781Z
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUserLeitnerState extends Document {
  tenantId: string;
  userId: string;
  questionId: mongoose.Types.ObjectId;
  level: number; // 1, 2, 3 (cajas)
  streak: number; // racha de aciertos consecutivos
  lastSeen: Date;
}

const UserLeitnerStateSchema = new Schema<IUserLeitnerState>({
  tenantId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true, index: true },
  level: { type: Number, default: 1, min: 1, max: 3, index: true },
  streak: { type: Number, default: 0 },
  lastSeen: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Índice compuesto único para evitar duplicidad de estado por usuario y pregunta
UserLeitnerStateSchema.index({ userId: 1, questionId: 1 }, { unique: true });

import { getTenantModel } from '@ajabadia/satellite-sdk';

const UserLeitnerState: Model<IUserLeitnerState> = getTenantModel<IUserLeitnerState>('UserLeitnerState', UserLeitnerStateSchema);

export default UserLeitnerState;
