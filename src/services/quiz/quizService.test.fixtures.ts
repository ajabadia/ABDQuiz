/**
 * @purpose Gestiona fijuras de pruebas para operaciones relacionadas con quizzes en la aplicación ABDQuiz.
 * @purpose_en Manages mock fixtures for quiz-related operations in the ABDQuiz application.
 * @refactorable false
 * @classification Business Service
 * @complexity Low
 * @fingerprint exports:10,imports:1,sig:vhi28r
 * @lastUpdated 2026-06-23T19:53:38.138Z
 */

import { vi } from 'vitest';

// ── Mock function refs ────────────────────────
export const mockFindById = vi.fn();
export const mockFind = vi.fn();
export const mockCountDocuments = vi.fn();
export const mockCreate = vi.fn();
export const mockFindOne = vi.fn();
export const mockAttemptFind = vi.fn();
export const mockAssignFindOne = vi.fn();

// ── Shared mocks setup ───────────────────
export function setupDefaultMocks() {
  // No-op: everything is already initialized
  vi.clearAllMocks();
}

// ── Mock document factories ───────────────
export function makeConfigDoc(overrides: Record<string, unknown> = {}) {
  return {
    _id: 'config-1',
    active: true,
    maxAttempts: 0,
    moduleFilter: [],
    questionCount: 2,
    shuffleOptions: false,
    excludePreviouslyCorrect: false,
    adaptiveQuestionSelection: false,
    showFeedbackDuringExam: true,
    globalTimeLimitSeconds: 600,
    sliceOptionsCount: null,
    scoringMode: 'simple',
    pointsPerCorrect: 1,
    penaltyPerIncorrect: 0,
    difficultyWeights: { easy: 1, medium: 2, hard: 3 },
    ...overrides,
  };
}

export function makeAttemptDoc(overrides: Record<string, unknown> = {}) {
  return {
    _id: 'attempt-1',
    userId: 'u1',
    tenantId: 't1',
    examConfigId: 'config-1',
    status: 'in_progress',
    mode: 'training',
    score: 0,
    percentage: 0,
    startedAt: new Date(),
    questions: [],
    save: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}
