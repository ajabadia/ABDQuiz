import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────

vi.mock('@ajabadia/satellite-sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ajabadia/satellite-sdk')>();
  return {
    ...actual,
    connectDB: vi.fn().mockResolvedValue(undefined),
    getIndustrialSession: vi.fn(),
    withTenantContext: vi.fn((fn: () => unknown) => fn()),
  };
});

vi.mock('@/models/ExamAttempt', () => {
  const mockFindById = vi.fn();
  class MockExamAttempt {
    static findById = mockFindById;
  }
  return {
    default: MockExamAttempt,
    mockFindById,
    getTenantModel: vi.fn(),
  };
});

vi.mock('@/services/ai/clientFactory', () => {
  const mockProvider = {
    name: 'test-provider',
    generateFeedback: vi.fn(),
  };
  return {
    createAIProvider: vi.fn(() => mockProvider),
    resetAIProvider: vi.fn(),
    mockProvider,
  };
});

// ── Import mock refs ───────────────────────────────────

import * as ResolverMod from '@ajabadia/satellite-sdk';
import * as ExamAttemptMod from '@/models/ExamAttempt';
import * as ClientFactoryMod from '@/services/ai/clientFactory';

export const { getIndustrialSession } = ResolverMod as unknown as {
  getIndustrialSession: ReturnType<typeof vi.fn>;
};
export const { mockFindById } = ExamAttemptMod as unknown as {
  mockFindById: ReturnType<typeof vi.fn>;
};
export const { createAIProvider, mockProvider } = ClientFactoryMod as unknown as {
  createAIProvider: ReturnType<typeof vi.fn>;
  mockProvider: {
    name: string;
    generateFeedback: ReturnType<typeof vi.fn>;
  };
};

// ── Fixtures ───────────────────────────────────────────

const mockQuestionSnapshotMC = {
  questionText: '¿Cuál es la capital de Francia?',
  options: ['Madrid', 'París', 'Berlín', 'Roma'],
  correctOptionIndex: 1,
  type: 'multiple_choice' as const,
};

const mockQuestionSnapshotOpen = {
  questionText: 'Explica el concepto de polimorfismo en POO.',
  options: [],
  correctOptionIndex: 0,
  type: 'open_text' as const,
};

function makeMockAttempt(overrides: Record<string, unknown> = {}) {
  return {
    _id: 'attempt-1',
    userId: 'student-1',
    tenantId: 'tenant-1',
    questions: [
      {
        questionId: 'q-1',
        questionSnapshot: mockQuestionSnapshotMC,
        selectedOptionIndex: 1,
        isCorrect: true,
        status: 'correcta' as const,
        timeSpentSeconds: 15,
      },
    ],
    save: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

const studentSession = {
  user: { id: 'student-1', tenantId: 'tenant-1', email: 'student@test.com' },
};

const otherStudentSession = {
  user: { id: 'student-2', tenantId: 'tenant-1', email: 'student2@test.com' },
};

// ── Dynamic import helper ─────────────────────────────

async function getActions() {
  return import('./feedback');
}

// ── Tests ──────────────────────────────────────────────

describe('generateQuestionFeedbackAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Validation ────

  describe('validation', () => {
    it('should reject empty attemptId', async () => {
      const { generateQuestionFeedbackAction } = await getActions();
      const result = await generateQuestionFeedbackAction('', 0);

      expect(result).toEqual({ success: false, error: 'Falta el ID del intento' });
      expect(mockFindById).not.toHaveBeenCalled();
    });

    it('should return error when attempt not found', async () => {
      getIndustrialSession.mockResolvedValue(studentSession);
      mockFindById.mockResolvedValue(null);

      const { generateQuestionFeedbackAction } = await getActions();
      const result = await generateQuestionFeedbackAction('nonexistent', 0);

      expect(result).toEqual({ success: false, error: 'Intento no encontrado' });
    });

    it('should return error when question index is out of bounds', async () => {
      getIndustrialSession.mockResolvedValue(studentSession);
      const attempt = makeMockAttempt();
      mockFindById.mockResolvedValue(attempt);

      const { generateQuestionFeedbackAction } = await getActions();
      const result = await generateQuestionFeedbackAction('attempt-1', 99);

      expect(result).toEqual({ success: false, error: 'Pregunta no encontrada' });
      expect(createAIProvider).not.toHaveBeenCalled();
    });
  });

  // ── Auth ────

  describe('authentication', () => {
    it('should reject unauthenticated user', async () => {
      getIndustrialSession.mockResolvedValue({ user: null });

      const { generateQuestionFeedbackAction } = await getActions();
      const result = await generateQuestionFeedbackAction('attempt-1', 0);

      expect(result).toEqual({ success: false, error: 'No autorizado' });
      expect(mockFindById).not.toHaveBeenCalled();
    });

    it('should reject session without user id', async () => {
      getIndustrialSession.mockResolvedValue({ user: { id: undefined } });

      const { generateQuestionFeedbackAction } = await getActions();
      const result = await generateQuestionFeedbackAction('attempt-1', 0);

      expect(result).toEqual({ success: false, error: 'No autorizado' });
      expect(mockFindById).not.toHaveBeenCalled();
    });

    it('should reject student trying to get feedback on another student attempt', async () => {
      getIndustrialSession.mockResolvedValue(otherStudentSession);
      const attempt = makeMockAttempt({ userId: 'student-1' });
      mockFindById.mockResolvedValue(attempt);

      const { generateQuestionFeedbackAction } = await getActions();
      const result = await generateQuestionFeedbackAction('attempt-1', 0);

      expect(result).toEqual({ success: false, error: 'No autorizado' });
      expect(attempt.save).not.toHaveBeenCalled();
    });
  });

  // ── Cache ────

  describe('caching', () => {
    it('should return cached aiFeedback without calling AI provider', async () => {
      getIndustrialSession.mockResolvedValue(studentSession);
      const attempt = makeMockAttempt({
        questions: [
          {
            questionId: 'q-1',
            questionSnapshot: mockQuestionSnapshotMC,
            selectedOptionIndex: 1,
            isCorrect: true,
            status: 'correcta' as const,
            timeSpentSeconds: 15,
            aiFeedback: 'Feedback cacheado desde la BD',
          },
        ],
      });
      mockFindById.mockResolvedValue(attempt);

      const { generateQuestionFeedbackAction } = await getActions();
      const result = await generateQuestionFeedbackAction('attempt-1', 0);

      expect(result).toEqual({ success: true, feedback: 'Feedback cacheado desde la BD' });
      expect(createAIProvider).not.toHaveBeenCalled();
      expect(attempt.save).not.toHaveBeenCalled();
    });

    it('should return cached feedback even if question was incorrect', async () => {
      getIndustrialSession.mockResolvedValue(studentSession);
      const attempt = makeMockAttempt({
        questions: [
          {
            questionId: 'q-1',
            questionSnapshot: mockQuestionSnapshotMC,
            selectedOptionIndex: 0, // wrong
            isCorrect: false,
            status: 'incorrecta' as const,
            timeSpentSeconds: 15,
            aiFeedback: 'Feedback para respuesta incorrecta',
          },
        ],
      });
      mockFindById.mockResolvedValue(attempt);

      const { generateQuestionFeedbackAction } = await getActions();
      const result = await generateQuestionFeedbackAction('attempt-1', 0);

      expect(result).toEqual({ success: true, feedback: 'Feedback para respuesta incorrecta' });
      expect(createAIProvider).not.toHaveBeenCalled();
    });
  });

  // ── AI Provider ────

  describe('AI provider integration', () => {
    it('should generate and cache feedback for correct multiple choice answer', async () => {
      getIndustrialSession.mockResolvedValue(studentSession);
      const attempt = makeMockAttempt();
      mockFindById.mockResolvedValue(attempt);
      mockProvider.generateFeedback.mockResolvedValue({
        feedback: '¡Excelente! París es la capital de Francia.',
      });

      const { generateQuestionFeedbackAction } = await getActions();
      const result = await generateQuestionFeedbackAction('attempt-1', 0);

      expect(result).toEqual({ success: true, feedback: '¡Excelente! París es la capital de Francia.' });
      expect(createAIProvider).toHaveBeenCalledTimes(1);
      expect(mockProvider.generateFeedback).toHaveBeenCalledWith({
        questionText: '¿Cuál es la capital de Francia?',
        studentAnswer: 'París',
        options: ['Madrid', 'París', 'Berlín', 'Roma'],
        correctAnswer: 'París',
        questionType: 'multiple_choice',
        isCorrect: true,
      });
      // Should cache the result
      expect((attempt.questions[0] as any).aiFeedback).toBe('¡Excelente! París es la capital de Francia.');
      expect(attempt.save).toHaveBeenCalledTimes(1);
    });

    it('should generate feedback for incorrect multiple choice answer', async () => {
      getIndustrialSession.mockResolvedValue(studentSession);
      const attempt = makeMockAttempt({
        questions: [
          {
            questionId: 'q-1',
            questionSnapshot: mockQuestionSnapshotMC,
            selectedOptionIndex: 0, // Madrid — wrong
            isCorrect: false,
            status: 'incorrecta' as const,
            timeSpentSeconds: 10,
          },
        ],
      });
      mockFindById.mockResolvedValue(attempt);
      mockProvider.generateFeedback.mockResolvedValue({
        feedback: 'Casi. La capital de Francia es París, no Madrid.',
      });

      const { generateQuestionFeedbackAction } = await getActions();
      const result = await generateQuestionFeedbackAction('attempt-1', 0);

      expect(result).toEqual({ success: true, feedback: 'Casi. La capital de Francia es París, no Madrid.' });
      expect(createAIProvider).toHaveBeenCalledTimes(1);
      expect(mockProvider.generateFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          studentAnswer: 'Madrid',
          correctAnswer: 'París',
          isCorrect: false,
        }),
      );
      expect(attempt.save).toHaveBeenCalledTimes(1);
    });

    it('should generate feedback for open text question using manualTextAnswer', async () => {
      getIndustrialSession.mockResolvedValue(studentSession);
      const attempt = makeMockAttempt({
        questions: [
          {
            questionId: 'q-2',
            questionSnapshot: mockQuestionSnapshotOpen,
            selectedOptionIndex: undefined,
            manualTextAnswer: 'El polimorfismo permite que objetos de diferentes clases respondan al mismo mensaje.',
            isCorrect: false,
            status: 'no_respondida' as const,
            timeSpentSeconds: 45,
          },
        ],
      });
      mockFindById.mockResolvedValue(attempt);
      mockProvider.generateFeedback.mockResolvedValue({
        feedback: 'Buena definición. El polimorfismo es un pilar de la POO...',
      });

      const { generateQuestionFeedbackAction } = await getActions();
      const result = await generateQuestionFeedbackAction('attempt-1', 0);

      expect(result).toEqual({ success: true, feedback: 'Buena definición. El polimorfismo es un pilar de la POO...' });
      expect(mockProvider.generateFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          questionType: 'open_text',
          studentAnswer: 'El polimorfismo permite que objetos de diferentes clases respondan al mismo mensaje.',
        }),
      );
      expect(attempt.save).toHaveBeenCalledTimes(1);
    });

    it('should pass "(No respondió)" when student did not answer', async () => {
      getIndustrialSession.mockResolvedValue(studentSession);
      const attempt = makeMockAttempt({
        questions: [
          {
            questionId: 'q-1',
            questionSnapshot: mockQuestionSnapshotMC,
            selectedOptionIndex: undefined,
            isCorrect: false,
            status: 'no_respondida' as const,
            timeSpentSeconds: 0,
          },
        ],
      });
      mockFindById.mockResolvedValue(attempt);
      mockProvider.generateFeedback.mockResolvedValue({
        feedback: 'No te preocupes. Repasemos la pregunta...',
      });

      const { generateQuestionFeedbackAction } = await getActions();
      const result = await generateQuestionFeedbackAction('attempt-1', 0);

      expect(result).toEqual({ success: true, feedback: 'No te preocupes. Repasemos la pregunta...' });
      expect(mockProvider.generateFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          studentAnswer: '(No respondió)',
        }),
      );
    });

    it('should pass "(No respondió)" for open text with no manualTextAnswer', async () => {
      getIndustrialSession.mockResolvedValue(studentSession);
      const attempt = makeMockAttempt({
        questions: [
          {
            questionId: 'q-2',
            questionSnapshot: mockQuestionSnapshotOpen,
            selectedOptionIndex: undefined,
            manualTextAnswer: undefined,
            isCorrect: false,
            status: 'no_respondida' as const,
            timeSpentSeconds: 0,
          },
        ],
      });
      mockFindById.mockResolvedValue(attempt);
      mockProvider.generateFeedback.mockResolvedValue({
        feedback: 'Es importante intentar responder...',
      });

      const { generateQuestionFeedbackAction } = await getActions();
      const result = await generateQuestionFeedbackAction('attempt-1', 0);

      expect(result).toEqual({ success: true, feedback: 'Es importante intentar responder...' });
      expect(mockProvider.generateFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          questionType: 'open_text',
          studentAnswer: '(No respondió)',
        }),
      );
    });

    it('should propagate AI provider errors', async () => {
      getIndustrialSession.mockResolvedValue(studentSession);
      const attempt = makeMockAttempt();
      mockFindById.mockResolvedValue(attempt);
      mockProvider.generateFeedback.mockRejectedValue(new Error('API rate limited'));

      const { generateQuestionFeedbackAction } = await getActions();
      // The error should propagate since the server action has no catch
      await expect(generateQuestionFeedbackAction('attempt-1', 0)).rejects.toThrow('API rate limited');
    });
  });
});
