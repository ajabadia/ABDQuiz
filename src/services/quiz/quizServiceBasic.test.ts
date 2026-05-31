import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  mockFindById,
  mockFind,
  mockCountDocuments,
  mockCreate,
  mockFindOne,
  mockAssignFindOne,
  setupDefaultMocks,
} from './quizService.test.mocks';

// ── Inline vi.mock calls (hoisted by vitest) ───────────
vi.mock('@ajabadia/satellite-sdk', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/models/ExamConfig', () => {
  class MockExamConfig {
    static findById = mockFindById;
  }
  return { default: MockExamConfig, mockFindById };
});

vi.mock('@/models/Question', () => {
  class MockQuestion {
    static find = mockFind;
  }
  return { default: MockQuestion, mockFind };
});

vi.mock('@/models/ExamAttempt', () => {
  class MockExamAttempt {
    static countDocuments = mockCountDocuments;
    static create = mockCreate;
    static findOne = mockFindOne;
    static find = vi.fn();
  }
  return {
    default: MockExamAttempt,
    mockCountDocuments,
    mockCreate,
    mockFindOne,
  };
});

vi.mock('@/models/ExamAssignment', () => {
  class MockExamAssignment {
    static findOne = mockAssignFindOne;
  }
  return { default: MockExamAssignment, mockFindOne: mockAssignFindOne };
});

// Must import after vi.mock hoisting
import { QuizService } from './quizService';

describe('QuizService — Basic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  describe('createExamAttempt', () => {
    it('should throw an error if configuration does not exist or is inactive', async () => {
      mockFindById.mockResolvedValue(null);

      await expect(
        QuizService.createExamAttempt('u1', 't1', 'config-invalid')
      ).rejects.toThrow('Configuración de examen no válida o inactiva');
    });

    it('should throw an error if user exceeds maxAttempts limit', async () => {
      mockFindById.mockResolvedValue({
        _id: 'config-1',
        active: true,
        maxAttempts: 3,
      });
      mockCountDocuments.mockResolvedValue(3);

      await expect(
        QuizService.createExamAttempt('u1', 't1', 'config-1')
      ).rejects.toThrow(
        'Has alcanzado el límite máximo de intentos permitidos'
      );
      expect(mockCountDocuments).toHaveBeenCalledWith({
        userId: 'u1',
        examConfigId: 'config-1',
        isInvalidated: { $ne: true },
      });
    });

    it('should select questions based on configuration module filter and create attempt', async () => {
      mockFindById.mockResolvedValue({
        _id: 'config-1',
        active: true,
        maxAttempts: 0,
        moduleFilter: ['Módulo 1'],
        questionCount: 2,
        showFeedbackDuringExam: true,
        excludePreviouslyCorrect: false,
      });

      const mockQuestions = [
        { _id: 'q1', questionText: 'P1', options: ['A', 'B'], difficulty: 'easy', module: 'Módulo 1', correctOptionIndex: 0 },
        { _id: 'q2', questionText: 'P2', options: ['C', 'D'], difficulty: 'medium', module: 'Módulo 1', correctOptionIndex: 1 },
      ];

      const mockLeanFind = vi.fn().mockResolvedValue(mockQuestions);
      mockFind.mockReturnValue({ lean: mockLeanFind } as any);

      const mockCreatedAttempt = { _id: 'attempt-1', questions: [] };
      mockCreate.mockResolvedValue(mockCreatedAttempt);

      const attempt = await QuizService.createExamAttempt('u1', 't1', 'config-1');

      expect(mockFind).toHaveBeenCalledWith({
        tenantId: 't1',
        active: true,
        module: { $in: ['Módulo 1'] },
      });
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 't1',
          userId: 'u1',
          mode: 'training',
          status: 'in_progress',
        })
      );
      expect(attempt).toEqual(mockCreatedAttempt);
    });
  });

  describe('submitAnswer', () => {
    it('should update and save the selected question answer in the attempt', async () => {
      const mockSave = vi.fn().mockResolvedValue(true);
      const mockAttempt = {
        _id: 'attempt-123',
        status: 'in_progress',
        questions: [
          { questionId: 'q1', status: 'no_respondida', selectedOptionIndex: null, timeSpentSeconds: 0, isCorrect: false },
          { questionId: 'q2', status: 'no_respondida', selectedOptionIndex: null, timeSpentSeconds: 0, isCorrect: false },
        ],
        save: mockSave,
      };

      mockFindOne.mockResolvedValue(mockAttempt);

      const updated = await QuizService.submitAnswer('attempt-123', 0, 1, 15, 'correcta', 'user-1');

      expect(mockFindOne).toHaveBeenCalledWith({ _id: 'attempt-123', userId: 'user-1' });
      expect(mockAttempt.questions[0].selectedOptionIndex).toBe(1);
      expect(mockAttempt.questions[0].timeSpentSeconds).toBe(15);
      expect(mockAttempt.questions[0].status).toBe('correcta');
      expect(mockAttempt.questions[0].isCorrect).toBe(true);
      expect(mockSave).toHaveBeenCalled();
      expect(updated).toEqual(mockAttempt);
    });

    it('should throw error if attemptToken is missing or incorrect when attempt has token', async () => {
      const mockAttempt = {
        _id: 'attempt-123',
        status: 'in_progress',
        attemptToken: 'secret-token',
        attemptTokenExpiresAt: new Date(Date.now() + 60000),
        questions: [{ questionId: 'q1', status: 'no_respondida', selectedOptionIndex: null, timeSpentSeconds: 0, isCorrect: false }],
        save: vi.fn(),
      };
      mockFindOne.mockResolvedValue(mockAttempt);

      await expect(
        QuizService.submitAnswer('attempt-123', 0, 1, 15, 'correcta', 'user-1', 'wrong-token')
      ).rejects.toThrow('Token de intento no válido o desincronizado.');
    });

    it('should throw error if attemptToken has expired', async () => {
      const mockAttempt = {
        _id: 'attempt-123',
        status: 'in_progress',
        attemptToken: 'secret-token',
        attemptTokenExpiresAt: new Date(Date.now() - 10000),
        questions: [{ questionId: 'q1', status: 'no_respondida', selectedOptionIndex: null, timeSpentSeconds: 0, isCorrect: false }],
        save: vi.fn(),
      };
      mockFindOne.mockResolvedValue(mockAttempt);

      await expect(
        QuizService.submitAnswer('attempt-123', 0, 1, 15, 'correcta', 'user-1', 'secret-token')
      ).rejects.toThrow('El token de intento ha expirado.');
    });
  });

  describe('finishExam', () => {
    it('should throw error if attemptToken is invalid in finishExam', async () => {
      const mockAttempt = {
        _id: 'attempt-finish-token',
        status: 'in_progress',
        attemptToken: 'secret-token',
        attemptTokenExpiresAt: new Date(Date.now() + 60000),
      };
      const mockPopulate = vi.fn().mockResolvedValue(mockAttempt);
      mockFindOne.mockReturnValue({ populate: mockPopulate } as any);

      await expect(
        QuizService.finishExam('attempt-finish-token', 'user-1', 'wrong-token')
      ).rejects.toThrow('Token de intento no válido o desincronizado.');
    });

    it('should calculate the score percentage correctly based on scoringMode', async () => {
      const mockSave = vi.fn().mockResolvedValue(true);
      const mockAttempt = {
        _id: 'attempt-finish',
        status: 'in_progress',
        examConfigId: {
          scoringMode: 'penalty',
          pointsPerCorrect: 2,
          penaltyPerIncorrect: 0.5,
        },
        questions: [
          { status: 'correcta', isCorrect: true, questionSnapshot: { difficulty: 'easy' } },
          { status: 'incorrecta', isCorrect: false, questionSnapshot: { difficulty: 'medium' } },
          { status: 'no_respondida', isCorrect: false, questionSnapshot: { difficulty: 'hard' } },
        ],
        save: mockSave,
      };

      const mockPopulate = vi.fn().mockResolvedValue(mockAttempt);
      mockFindOne.mockReturnValue({ populate: mockPopulate } as any);

      const result = await QuizService.finishExam('attempt-finish', 'user-1');

      expect(mockFindOne).toHaveBeenCalledWith({ _id: 'attempt-finish', userId: 'user-1' });
      expect(result.status).toBe('completed');
      expect(result.endedAt).toBeInstanceOf(Date);
      expect(result.score).toBe(1.5);
      expect(result.percentage).toBe(25);
      expect(mockSave).toHaveBeenCalled();
    });

    it('should handle weighted scoring correctly using difficultyWeights', async () => {
      const mockSave = vi.fn().mockResolvedValue(true);
      const mockAttempt = {
        _id: 'attempt-finish-weighted',
        status: 'in_progress',
        examConfigId: {
          scoringMode: 'weighted',
          difficultyWeights: { easy: 1, medium: 2, hard: 5 },
        },
        questions: [
          { status: 'correcta', isCorrect: true, questionSnapshot: { difficulty: 'easy' } },
          { status: 'correcta', isCorrect: true, questionSnapshot: { difficulty: 'medium' } },
          { status: 'incorrecta', isCorrect: false, questionSnapshot: { difficulty: 'hard' } },
        ],
        save: mockSave,
      };

      const mockPopulate = vi.fn().mockResolvedValue(mockAttempt);
      mockFindOne.mockReturnValue({ populate: mockPopulate } as any);

      const result = await QuizService.finishExam('attempt-finish-weighted', 'user-1');

      expect(result.score).toBe(3);
      expect(result.percentage).toBe(37.5);
    });
  });
});
