/**
 * @purpose Gestiona el modelo de datos y la estructura de la base de datos para las configuraciones de exámenes utilizando Mongoose, incluyendo propiedades como tenantId, preguntaCount, límites de tiempo, modos de puntuación y comportamientos de interfaz.
 * @purpose_en Defines the data model and schema for exam configurations using Mongoose, including properties like tenantId, questionCount, time limits, scoring modes, and UI behaviors.
 * @refactorable false (contains only static declarations/types/constants)
 * @classification Type Definition
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:1foe96m
 * @lastUpdated 2026-06-23T19:52:28.768Z
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IExamConfig extends Document {
  tenantId: string;
  name: string;
  description?: string;
  
  // --- Selección de Contenido ---
  questionCount: number;
  moduleFilter: string[]; // [] = todos
  difficultyDistribution?: {
    easy?: number;
    medium?: number;
    hard?: number;
  };
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  sliceOptionsCount: number | null; // Nº de opciones a mostrar (dynamic slicing). null = todas
  
  // --- Temporización ---
  globalTimeLimitSeconds: number | null;
  questionTimeLimitSeconds: number | null;
  
  // --- Puntuación ---
  scoringMode: 'simple' | 'weighted' | 'penalty';
  pointsPerCorrect: number;
  penaltyPerIncorrect: number;
  difficultyWeights?: {
    easy: number;
    medium: number;
    hard: number;
  };
  passThreshold: number; // 0-100
  
  // --- Comportamiento de UI ---
  showFeedbackDuringExam: boolean;
  allowSkip: boolean;
  allowReviewPrevious: boolean;
  autoAdvanceOnSelect: boolean;
  reviewOmittedQuestions: boolean;
  excludePreviouslyCorrect: boolean;
  adaptiveQuestionSelection: boolean;
  maxAttempts: number;
  
  // --- Vinculación al Ecosistema de Aprendizaje ---
  courseId?: mongoose.Types.ObjectId; // Referencia opcional a Course (Fase 1)

  // --- Metadata ---
  isDefault: boolean;
  active: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExamConfigSchema: Schema = new Schema(
  {
    tenantId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    
    // --- Selección de Contenido ---
    questionCount: { type: Number, default: 30 },
    moduleFilter: [String],
    difficultyDistribution: {
      easy: Number,
      medium: Number,
      hard: Number
    },
    shuffleQuestions: { type: Boolean, default: true },
    shuffleOptions: { type: Boolean, default: true },
    sliceOptionsCount: { type: Number, default: null },
    
    // --- Temporización ---
    globalTimeLimitSeconds: { type: Number, default: 600 },
    questionTimeLimitSeconds: { type: Number, default: 30 },
    
    // --- Puntuación ---
    scoringMode: { 
      type: String, 
      enum: ['simple', 'weighted', 'penalty'], 
      default: 'simple' 
    },
    pointsPerCorrect: { type: Number, default: 1 },
    penaltyPerIncorrect: { type: Number, default: 0 },
    difficultyWeights: {
      easy: { type: Number, default: 1 },
      medium: { type: Number, default: 1 },
      hard: { type: Number, default: 1 }
    },
    passThreshold: { type: Number, default: 70 },
    
    // --- Comportamiento de UI ---
    showFeedbackDuringExam: { type: Boolean, default: false },
    allowSkip: { type: Boolean, default: true },
    allowReviewPrevious: { type: Boolean, default: false },
    autoAdvanceOnSelect: { type: Boolean, default: false },
    reviewOmittedQuestions: { type: Boolean, default: false },
    excludePreviouslyCorrect: { type: Boolean, default: false },
    adaptiveQuestionSelection: { type: Boolean, default: false },
    maxAttempts: { type: Number, default: 0 },
    
    // --- Vinculación al Ecosistema de Aprendizaje ---
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', index: true },

    // --- Metadata ---
    isDefault: { type: Boolean, default: false },
    active: { type: Boolean, default: true, index: true },
    createdBy: { type: String, required: true }
  },
  { timestamps: true }
);

import { getTenantModel } from '@ajabadia/satellite-sdk/db';

const ExamConfig: Model<IExamConfig> = getTenantModel<IExamConfig>('ExamConfig', ExamConfigSchema);

export default ExamConfig;
