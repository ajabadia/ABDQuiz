export interface FeedbackParams {
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
