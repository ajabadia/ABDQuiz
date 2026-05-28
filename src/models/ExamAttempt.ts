import mongoose, { Schema, Document } from 'mongoose';
import { type QuizQuestionSnapshot } from '@/types/quiz';

export interface IExamAttempt extends Document {
  tenantId: string;
  userId: string;
  examConfigId?: string | mongoose.Types.ObjectId;
  mode: 'training' | 'mock';
  moduleFilter?: string[];
  score: number;
  percentage: number;
  timeLimitSeconds: number;
  questionTimeLimitSeconds: number;
  startedAt: Date;
  endedAt?: Date;
  status: 'in_progress' | 'completed' | 'timeout';
  gradingStatus: 'auto_graded' | 'pending_manual_review' | 'manually_graded';
  gradedBy?: string;
  gradedAt?: Date;
  isInvalidated?: boolean;
  invalidatedBy?: string;
  invalidatedAt?: Date;
  attemptToken?: string; // Token de intento efímero para prevenir replay attacks / manipulación
  attemptTokenExpiresAt?: Date; // Expiración absoluta del token
  lastHeartbeatAt?: Date; // Último heartbeat recibido (§12.D — anti-clock tampering)
  questions: {
    questionId: string | mongoose.Types.ObjectId;
    questionSnapshot: QuizQuestionSnapshot;
    selectedOptionIndex?: number | null;
    manualTextAnswer?: string;
    manualPointsAwarded?: number;
    feedback?: string;
    isCorrect: boolean;
    timeSpentSeconds: number;
    status: 'correcta' | 'incorrecta' | 'no_respondida' | 'no_respondida_por_tiempo';
  }[];
}

const ExamAttemptSchema: Schema = new Schema(
  {
    tenantId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    examConfigId: { type: Schema.Types.ObjectId, ref: 'ExamConfig' },
    mode: { type: String, enum: ['training', 'mock'], required: true },
    moduleFilter: [String],
    score: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    timeLimitSeconds: { type: Number, default: 600 },
    questionTimeLimitSeconds: { type: Number, default: 30 },
    startedAt: { type: Date, default: Date.now },
    endedAt: Date,
    status: {
      type: String,
      enum: ['in_progress', 'completed', 'timeout'],
      default: 'in_progress',
    },
    gradingStatus: {
      type: String,
      enum: ['auto_graded', 'pending_manual_review', 'manually_graded'],
      default: 'auto_graded',
    },
    gradedBy: String,
    gradedAt: Date,
    isInvalidated: { type: Boolean, default: false },
    invalidatedBy: String,
    invalidatedAt: Date,
    attemptToken: { type: String, index: true },
    attemptTokenExpiresAt: Date,
    lastHeartbeatAt: { type: Date },
    questions: [
      {
        questionId: { type: Schema.Types.ObjectId, ref: 'Question' },
        questionSnapshot: Schema.Types.Mixed,
        selectedOptionIndex: Number,
        manualTextAnswer: String,
        manualPointsAwarded: Number,
        feedback: String,
        isCorrect: { type: Boolean, default: false },
        timeSpentSeconds: { type: Number, default: 0 },
        status: {
          type: String,
          enum: [
            'correcta',
            'incorrecta',
            'no_respondida',
            'no_respondida_por_tiempo',
          ],
        },
      },
    ],
  },
  { timestamps: true }
);

import { getTenantModel } from '@ajabadia/satellite-sdk';

const ExamAttempt = getTenantModel<IExamAttempt>('ExamAttempt', ExamAttemptSchema);

export default ExamAttempt;
