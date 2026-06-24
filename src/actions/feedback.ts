/**
 * @purpose Gestiona retroalimentación semántica AI para una pregunta específica en un intento de examen, almacenando el resultado para evitar recálculo.
 * @purpose_en Generates AI-powered semantic feedback for a specific question in an exam attempt, caching the result to avoid re-computation.
 * @refactorable false
 * @classification Business Service
 * @complexity Medium
 * @fingerprint exports:1,imports:3,sig:ydpxbq
 * @lastUpdated 2026-06-23T23:07:37.935Z
 */

'use server';

import { withTenantContext, connectDB, getIndustrialSession, resolveTargetTenantContext } from '@ajabadia/satellite-sdk';
import ExamAttempt from '@/models/ExamAttempt';
import { createAIProvider } from '@/services/ai/clientFactory';

/**
 * Generate AI-powered semantic feedback for a specific question in an attempt.
 * Caches the result in the `aiFeedback` field of the question subdocument so
 * subsequent calls return immediately without re-consuming AI credits.
 */
export async function generateQuestionFeedbackAction(attemptId: string, questionIndex: number) {
  if (!attemptId) return { success: false as const, error: 'Falta el ID del intento' };

  return withTenantContext(async () => {
    await connectDB();

    const session = await getIndustrialSession();
    if (!session?.user?.id) {
      return { success: false as const, error: 'No autorizado' };
    }

    const attempt = await ExamAttempt.findById(attemptId);
    if (!attempt) {
      return { success: false as const, error: 'Intento no encontrado' };
    }

    // Verify ownership — student can only get feedback on their own attempts
    if (attempt.userId !== session.user.id) {
      return { success: false as const, error: 'No autorizado' };
    }

    const question = attempt.questions[questionIndex];
    if (!question) {
      return { success: false as const, error: 'Pregunta no encontrada' };
    }

    // Return cached feedback if already generated
    const cached = question.aiFeedback;
    if (cached) {
      return { success: true as const, feedback: cached };
    }

    const snapshot = question.questionSnapshot as {
      questionText: string;
      options: string[];
      correctOptionIndex: number;
      type?: 'multiple_choice' | 'open_text';
    };

    // Build student answer text
    let studentAnswer: string;
    if (snapshot.type === 'open_text') {
      studentAnswer = question.manualTextAnswer || '(No respondió)';
    } else if (question.selectedOptionIndex !== undefined && question.selectedOptionIndex !== null) {
      studentAnswer = snapshot.options[question.selectedOptionIndex] || '(Opción inválida)';
    } else {
      studentAnswer = '(No respondió)';
    }

    const provider = createAIProvider(attempt.tenantId);
    const result = await provider.generateFeedback({
      tenantId: attempt.tenantId,
      questionText: snapshot.questionText,
      studentAnswer,
      options: snapshot.options,
      correctAnswer: snapshot.options[snapshot.correctOptionIndex],
      questionType: snapshot.type || 'multiple_choice',
      isCorrect: question.status === 'correcta',
    });

    // Cache feedback in the DB
    question.aiFeedback = result.feedback;
    await attempt.save();

    return { success: true as const, feedback: result.feedback };
  });
}
