import mongoose, { Schema, Document } from 'mongoose';
import { type QuizQuestionSnapshot } from '@/types/quiz';

export interface IExamAttempt extends Document {
  tenantId: string;
  userId: string;
  examConfigId?: string | mongoose.Types.ObjectId; // Nuevo: Referencia a la plantilla
  mode: 'training' | 'mock';
  moduleFilter?: string[];
  score: number;
  percentage: number;
  timeLimitSeconds: number;
  questionTimeLimitSeconds: number;
  startedAt: Date;
  endedAt?: Date;
  status: 'in_progress' | 'completed' | 'timeout';
  isInvalidated?: boolean;
  invalidatedBy?: string;
  invalidatedAt?: Date;
  questions: {
    questionId: string | mongoose.Types.ObjectId;
    questionSnapshot: QuizQuestionSnapshot;
    selectedOptionIndex?: number | null;
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
    isInvalidated: { type: Boolean, default: false },
    invalidatedBy: String,
    invalidatedAt: Date,
    questions: [
      {
        questionId: { type: Schema.Types.ObjectId, ref: 'Question' },
        questionSnapshot: Schema.Types.Mixed,
        selectedOptionIndex: Number,
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

import { getTenantModel } from '@/lib/database/tenant-model';

const ExamAttempt = getTenantModel<IExamAttempt>('ExamAttempt', ExamAttemptSchema);

export default ExamAttempt;
