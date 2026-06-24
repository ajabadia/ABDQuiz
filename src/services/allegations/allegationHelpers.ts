/**
 * @purpose Gestiona y calcula puntuaciones para intentos de exámenes según respuestas del usuario, configuraciones de preguntas y reglas de puntuación.
 * @purpose_en Manages and calculates scores for exam attempts based on user responses, question configurations, and scoring rules.
 * @refactorable false
 * @classification Business Service
 * @complexity Medium
 * @fingerprint exports:5,imports:5,sig:1m2oak3
 * @lastUpdated 2026-06-23T19:52:55.303Z
 */

import ExamAttempt from '@/models/ExamAttempt';
import ExamConfig from '@/models/ExamConfig';
import mongoose from 'mongoose';

export interface IAttemptQuestion {
  questionId: mongoose.Types.ObjectId;
  selectedOptionIndex?: number;
  isCorrect?: boolean;
  status?: 'correcta' | 'incorrecta' | 'no_respondida';
  questionSnapshot: {
    questionText: string;
    correctOptionIndex: number;
    difficulty?: 'easy' | 'medium' | 'hard';
    isCancelled?: boolean;
    module?: string;
  };
}

export function applyCorrectionShift(
  qBlock: IAttemptQuestion,
  nextCorrectOptionIndex: number
): void {
  qBlock.questionSnapshot.correctOptionIndex = nextCorrectOptionIndex;
  const isCorrect = qBlock.selectedOptionIndex === nextCorrectOptionIndex;
  qBlock.isCorrect = isCorrect;
  qBlock.status = isCorrect
    ? 'correcta'
    : (typeof qBlock.selectedOptionIndex === 'number' ? 'incorrecta' : 'no_respondida');
}

export function applyCancelQuestion(qBlock: IAttemptQuestion): void {
  if (!qBlock.questionSnapshot) {
    qBlock.questionSnapshot = { questionText: '', correctOptionIndex: 0 };
  }
  qBlock.questionSnapshot.isCancelled = true;
  qBlock.isCorrect = false;
  qBlock.status = 'no_respondida';
}

export function applyGivePoints(qBlock: IAttemptQuestion): void {
  qBlock.isCorrect = true;
  qBlock.status = 'correcta';
}

import { IExamAttempt } from '@/models/ExamAttempt';
import { IExamConfig } from '@/models/ExamConfig';

export async function recalculateAttemptScore(
  attempt: IExamAttempt,
  config: IExamConfig | null
): Promise<void> {
  let totalScore = 0;
  let maxPossible = 0;

  for (const q of (attempt.questions as unknown as IAttemptQuestion[])) {
    if (q.questionSnapshot?.isCancelled) continue;

    const diff = q.questionSnapshot.difficulty || 'medium';
    let correctPoints = 1;

    if (config?.scoringMode === 'weighted' && config.difficultyWeights) {
      correctPoints = config.difficultyWeights[diff as 'easy' | 'medium' | 'hard'] || 1;
    } else {
      correctPoints = config?.pointsPerCorrect || 1;
    }

    maxPossible += correctPoints;

    if (q.isCorrect || q.status === 'correcta') {
      totalScore += correctPoints;
    } else if (q.status === 'incorrecta' && config?.scoringMode === 'penalty') {
      totalScore -= config.penaltyPerIncorrect || 0;
    }
  }

  attempt.score = Math.max(0, totalScore);
  attempt.percentage = maxPossible > 0 ? (attempt.score / maxPossible) * 100 : 0;
}
