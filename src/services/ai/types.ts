/**
 * @purpose Gestiona interfaces para parámetros de retroalimentación y resultados, y una interfaz de proveedor de inteligencia artificial.
 * @purpose_en Defines interfaces for feedback parameters and results, and an AI provider interface.
 * @refactorable false
 * @classification Type Definition
 * @complexity Low
 * @fingerprint exports:3,imports:0,sig:a0iqkh
 * @lastUpdated 2026-06-23T19:52:51.005Z
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
