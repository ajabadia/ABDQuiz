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
    
    // --- Metadata ---
    isDefault: { type: Boolean, default: false },
    active: { type: Boolean, default: true, index: true },
    createdBy: { type: String, required: true }
  },
  { timestamps: true }
);

const ExamConfig: Model<IExamConfig> = mongoose.models.ExamConfig || mongoose.model<IExamConfig>('ExamConfig', ExamConfigSchema);

export default ExamConfig;
