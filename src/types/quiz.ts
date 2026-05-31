import { type IExamAttempt } from "@/models/ExamAttempt";
import { type IExamConfig } from "@/models/ExamConfig";

export interface QuizQuestionSnapshot {
  questionText: string;
  options: string[];
  module: string;
  source: string;
  explanation: string;
  correctOptionIndex: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  isCancelled?: boolean;
  type?: 'multiple_choice' | 'open_text';
  /** §12.A — Adjuntos */
  attachments?: { url: string; name: string; type: string; size: number }[];
}

export interface QuizAttemptQuestion {
  questionId: string;
  questionSnapshot: QuizQuestionSnapshot;
  selectedOptionIndex?: number;
  manualTextAnswer?: string;
  aiFeedback?: string;
  isCorrect: boolean;
  timeSpentSeconds: number;
  status: 'correcta' | 'incorrecta' | 'no_respondida' | 'no_respondida_por_tiempo';
}

// Extendemos el modelo para asegurar que el Client Component reciba los datos serializados
export interface SerializedExamAttempt extends Omit<IExamAttempt, 'questions' | '_id' | 'examConfigId'> {
  _id: string;
  questions: QuizAttemptQuestion[];
  attemptToken?: string;
  examConfigId?: SerializedExamConfig;
}

export interface SerializedExamConfig extends Omit<IExamConfig, '_id' | 'createdAt' | 'updatedAt'> {
  _id: string;
  createdAt: string;
  updatedAt: string;
}

export interface ModuleAnalytics {
  module: string;
  answered: number;
  correct: number;
  percentage: number;
}

export interface DifficultyAnalytics {
  easy: { correct: number; total: number; percentage: number };
  medium: { correct: number; total: number; percentage: number };
  hard: { correct: number; total: number; percentage: number };
}

export interface AttemptSummary {
  _id: string;
  startedAt: string;
  percentage: number;
  score: number;
  mode: 'training' | 'mock';
  status: 'in_progress' | 'completed' | 'timeout';
  totalQuestions: number;
}

export interface AnalyticsPayload {
  totalAttempts: number;
  completedAttempts: number;
  averageScore: number;
  avgTimePerQuestion: number;
  timeline: { startedAt: string; percentage: number; mode: string }[];
  modulePerformance: ModuleAnalytics[];
  difficultyPerformance: DifficultyAnalytics;
  recentAttempts: AttemptSummary[];
}
