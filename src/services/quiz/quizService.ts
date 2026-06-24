/**
 * @purpose Gestiona intentos de quiz manejando latidos, creando nuevos intentos, enviando respuestas y calificando exámenes.
 * @purpose_en Manages quiz attempts by handling heartbeats, creating new attempts, submitting answers, and grading exams.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Business Service
 * @complexity Medium
 * @fingerprint exports:1,imports:6,sig:7qnlsj
 * @lastUpdated 2026-06-23T23:24:07.219Z
 */

import { connectDB } from '@ajabadia/satellite-sdk';
import ExamAttempt from '@/models/ExamAttempt';
import { type IExamAttempt } from '@/models/ExamAttempt';
import { type IExamConfig } from '@/models/ExamConfig';
import { type QuizAttemptQuestion } from '@/types/quiz';
import { buildExamAttempt } from './quizAttemptBuilder';

export class QuizService {
  /**
   * §12.D — Anti-clock tampering: registra un heartbeat del cliente mientras el examen está activo.
   */
  static async sendHeartbeat(attemptId: string, userId: string): Promise<{ success: boolean; attemptEnded?: boolean }> {
    await connectDB();

    const attempt = await ExamAttempt.findOne({ _id: attemptId, userId });
    if (!attempt) throw new Error('Exam attempt not found or unauthorized');

    if (attempt.status !== 'in_progress') {
      return { success: false, attemptEnded: true };
    }

    attempt.lastHeartbeatAt = new Date();
    await attempt.save();

    return { success: true };
  }

  /**
   * Genera un nuevo intento de examen basado en una configuración técnica.
   * Delega la construcción pesada a buildExamAttempt().
   */
  static async createExamAttempt(userId: string, tenantId: string, examConfigId: string): Promise<IExamAttempt> {
    return buildExamAttempt(userId, tenantId, examConfigId);
  }

  /**
   * Registra la respuesta a una pregunta específica
   */
  static async submitAnswer(
    attemptId: string,
    questionIndex: number,
    selectedOptionIndex: number | null,
    timeSpent: number,
    status: QuizAttemptQuestion['status'],
    userId: string,
    attemptToken?: string,
    textAnswer?: string
  ): Promise<IExamAttempt> {
    await connectDB();

    const attempt = await ExamAttempt.findOne({ _id: attemptId, userId });
    if (!attempt || attempt.status !== 'in_progress') {
      throw new Error('Exam attempt not found, unauthorized, or already finished');
    }

    // Validación temporal y token del intento
    if (attempt.attemptToken) {
      if (!attemptToken || attempt.attemptToken !== attemptToken) {
        throw new Error('Token de intento no válido o desincronizado.');
      }
      if (attempt.attemptTokenExpiresAt && new Date() > attempt.attemptTokenExpiresAt) {
        throw new Error('El token de intento ha expirado.');
      }
    }

    const question = attempt.questions[questionIndex];
    if (!question) throw new Error('Question index out of bounds');

    question.selectedOptionIndex = selectedOptionIndex;
    question.timeSpentSeconds = timeSpent;
    question.status = status;
    question.isCorrect = status === 'correcta';
    if (textAnswer !== undefined) {
      question.manualTextAnswer = textAnswer;
    }

    await attempt.save();
    return attempt;
  }

  /**
   * Finaliza el examen y calcula la nota según las reglas de la configuración
   */
  static async finishExam(attemptId: string, userId: string, attemptToken?: string): Promise<IExamAttempt> {
    await connectDB();

    const attempt = await ExamAttempt.findOne({ _id: attemptId, userId }).populate<{ examConfigId: IExamConfig }>('examConfigId');
    if (!attempt) throw new Error('Exam attempt not found or unauthorized');

    // §12.D — Double-submission guard
    if (attempt.status !== 'in_progress') {
      throw new Error('Este intento ya ha sido finalizado. No se permite el doble envío.');
    }

    // Validación temporal y token del intento
    if (attempt.attemptToken) {
      if (!attemptToken || attempt.attemptToken !== attemptToken) {
        throw new Error('Token de intento no válido o desincronizado.');
      }
      if (attempt.attemptTokenExpiresAt && new Date() > attempt.attemptTokenExpiresAt) {
        throw new Error('El token de intento ha expirado.');
      }
    }

    const config = attempt.examConfigId;
    if (!config) throw new Error('Exam configuration missing');

    let totalScore = 0;
    let maxPossible = 0;
    const questions = attempt.questions;

    for (const q of questions) {
      const diff = q.questionSnapshot.difficulty || 'medium';
      let correctPoints = 1;

      if (config?.scoringMode === 'weighted' && config.difficultyWeights) {
        correctPoints = config.difficultyWeights[diff as 'easy' | 'medium' | 'hard'] || 1;
      } else {
        correctPoints = config?.pointsPerCorrect || 1;
      }

      maxPossible += correctPoints;

      if (q.status === 'correcta') {
        totalScore += correctPoints;
      } else if (q.status === 'incorrecta' && config?.scoringMode === 'penalty') {
        totalScore -= config.penaltyPerIncorrect || 0;
      }
    }

    attempt.status = 'completed';
    attempt.endedAt = new Date();
    attempt.score = Math.max(0, totalScore);
    attempt.percentage = maxPossible > 0 ? (attempt.score / maxPossible) * 100 : 0;

    const hasOpenText = attempt.questions.some(q => q.questionSnapshot?.type === 'open_text');
    attempt.gradingStatus = hasOpenText ? 'pending_manual_review' : 'auto_graded';

    await attempt.save();
    return attempt as unknown as IExamAttempt;
  }
}
