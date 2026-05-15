import { type IExamAttempt } from "@/models/ExamAttempt";

export interface QuizQuestionSnapshot {
  questionText: string;
  options: string[];
  module: string;
  source: string;
  explanation: string;
  correctOptionIndex: number;
}

export interface QuizAttemptQuestion {
  questionId: string;
  questionSnapshot: QuizQuestionSnapshot;
  selectedOptionIndex?: number;
  isCorrect: boolean;
  timeSpentSeconds: number;
  status: 'correcta' | 'incorrecta' | 'no_respondida' | 'no_respondida_por_tiempo';
}

// Extendemos el modelo para asegurar que el Client Component reciba los datos serializados
export interface SerializedExamAttempt extends Omit<IExamAttempt, 'questions' | '_id'> {
  _id: string;
  questions: QuizAttemptQuestion[];
}
