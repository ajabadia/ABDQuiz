/**
 * @purpose Gestiona interfaces para parámetros y resultados de retroalimentación, y una interfaz de proveedor de inteligencia artificial.
 * @purpose_en Defines interfaces for feedback parameters and results, and an AI provider interface.
 * @refactorable false
 * @classification Type Definition
 * @complexity Low
 * @fingerprint exports:3,imports:0,sig:10y010k
 * @lastUpdated 2026-06-26T10:03:23.391Z
 */

export interface FeedbackParams {
  tenantId: string;
  questionText: string;
  studentAnswer: string;
  options?: string[];
  correctAnswer?: string;
  questionType: 'multiple_choice' | 'open_text';
  isCorrect?: boolean;
}

export interface FeedbackResult {
  feedback: string;
}

export interface AIProvider {
  generateFeedback(params: FeedbackParams): Promise<FeedbackResult>;
  readonly name: string;
}
