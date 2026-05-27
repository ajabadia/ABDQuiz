import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QuizService } from './quizService';

// 1. Mock connection module
vi.mock('@/lib/database/mongodb', () => {
  return {
    default: vi.fn().mockResolvedValue(null),
  };
});

// 2. Mock Mongoose models
vi.mock('@/models/ExamConfig', () => {
  const mockFindById = vi.fn();
  class MockExamConfig {
    static findById = mockFindById;
  }
  return {
    default: MockExamConfig,
    mockFindById,
  };
});

vi.mock('@/models/Question', () => {
  const mockFind = vi.fn();
  class MockQuestion {
    static find = mockFind;
  }
  return {
    default: MockQuestion,
    mockFind,
  };
});

vi.mock('@/models/ExamAttempt', () => {
  const mockCountDocuments = vi.fn();
  const mockCreate = vi.fn();
  const mockFindOne = vi.fn();
  const mockFind = vi.fn();
  class MockExamAttempt {
    static countDocuments = mockCountDocuments;
    static create = mockCreate;
    static findOne = mockFindOne;
    static find = mockFind;
  }
  return {
    default: MockExamAttempt,
    mockCountDocuments,
    mockCreate,
    mockFindOne,
    mockFind,
  };
});

// Import mock references
import * as ExamConfigMod from '@/models/ExamConfig';
import * as QuestionMod from '@/models/Question';
vi.mock('@/models/ExamAssignment', () => {
  const mockFindOne = vi.fn();
  class MockExamAssignment {
    static findOne = mockFindOne;
  }
  return {
    default: MockExamAssignment,
    mockFindOne,
  };
});

import * as ExamAttemptMod from '@/models/ExamAttempt';

const { mockFindById } = ExamConfigMod as unknown as { mockFindById: ReturnType<typeof vi.fn> };
const { mockFind } = QuestionMod as unknown as { mockFind: ReturnType<typeof vi.fn> };
import * as ExamAssignmentMod from '@/models/ExamAssignment';
const { mockFindOne: mockAssignFindOne } = ExamAssignmentMod as unknown as { mockFindOne: ReturnType<typeof vi.fn> };

const { mockCountDocuments, mockCreate, mockFindOne, mockFind: mockAttemptFind } = ExamAttemptMod as unknown as {
  mockCountDocuments: ReturnType<typeof vi.fn>;
  mockCreate: ReturnType<typeof vi.fn>;
  mockFindOne: ReturnType<typeof vi.fn>;
  mockFind: ReturnType<typeof vi.fn>;
};

describe('QuizService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createExamAttempt', () => {
    beforeEach(() => {
      // Default: active assignment exists
      mockAssignFindOne.mockResolvedValue({
        tenantId: 't1',
        examConfigId: 'config-1',
        status: 'published',
        active: true,
        startDate: new Date('2020-01-01'),
        endDate: new Date('2030-01-01'),
        maxAttempts: 0,
      });
    });

    it('should throw an error if configuration does not exist or is inactive', async () => {
      mockFindById.mockResolvedValue(null);

      await expect(
        QuizService.createExamAttempt('u1', 't1', 'config-invalid')
      ).rejects.toThrow('Configuración de examen no válida o inactiva');
    });

    it('should throw an error if user exceeds maxAttempts limit', async () => {
      mockAssignFindOne.mockResolvedValue({
        tenantId: 't1',
        examConfigId: 'config-1',
        status: 'published',
        active: true,
        startDate: new Date('2020-01-01'),
        endDate: new Date('2030-01-01'),
        maxAttempts: 0,
      });
      mockFindById.mockResolvedValue({
        _id: 'config-1',
        active: true,
        maxAttempts: 3,
      });
      mockCountDocuments.mockResolvedValue(3);

      await expect(
        QuizService.createExamAttempt('u1', 't1', 'config-1')
      ).rejects.toThrow('Has alcanzado el límite máximo de intentos permitidos');
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
      mockFind.mockReturnValue({
        lean: mockLeanFind,
      } as any);

      const mockCreatedAttempt = {
        _id: 'attempt-1',
        questions: [],
      };
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

    it('should implement stratified difficulty selection if distribution is provided', async () => {
      mockFindById.mockResolvedValue({
        _id: 'config-1',
        active: true,
        maxAttempts: 0,
        moduleFilter: [],
        questionCount: 3,
        difficultyDistribution: {
          easy: 1,
          medium: 1,
          hard: 1,
        },
        excludePreviouslyCorrect: false,
      });

      const mockQuestions = [
        { _id: 'qe', questionText: 'Fácil', options: ['A'], difficulty: 'easy', correctOptionIndex: 0 },
        { _id: 'qm', questionText: 'Media', options: ['B'], difficulty: 'medium', correctOptionIndex: 0 },
        { _id: 'qh1', questionText: 'Difícil 1', options: ['C'], difficulty: 'hard', correctOptionIndex: 0 },
        { _id: 'qh2', questionText: 'Difícil 2', options: ['D'], difficulty: 'hard', correctOptionIndex: 0 },
      ];

      mockFind.mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockQuestions),
      } as any);

      mockCreate.mockImplementation(async (data: any) => {
        return {
          _id: 'attempt-stratified',
          questions: data.questions,
        };
      });

      const attempt = await QuizService.createExamAttempt('u1', 't1', 'config-1');

      // Check we have 3 questions
      expect(attempt.questions).toHaveLength(3);

      const diffs = attempt.questions.map((q: any) => q.questionSnapshot.difficulty);
      expect(diffs).toContain('easy');
      expect(diffs).toContain('medium');
      expect(diffs).toContain('hard');
    });

    it('should shuffle options and correctly remap correctOptionIndex when shuffleOptions is enabled', async () => {
      mockFindById.mockResolvedValue({
        _id: 'config-shuffle',
        active: true,
        maxAttempts: 0,
        moduleFilter: [],
        questionCount: 1,
        shuffleOptions: true,
        excludePreviouslyCorrect: false,
      });

      const mockQuestions = [
        { _id: 'q-shuffle', questionText: 'Shuffle P', options: ['A', 'B', 'C', 'D'], correctOptionIndex: 2 }, // Option 'C' is correct
      ];

      mockFind.mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockQuestions),
      } as any);

      const mockSave = vi.fn().mockResolvedValue(true);
      mockCreate.mockImplementation(async (data: any) => {
        return {
          _id: 'attempt-shuffle',
          questions: data.questions,
          save: mockSave,
        };
      });

      const attempt = await QuizService.createExamAttempt('u1', 't1', 'config-shuffle');

      // Verify that options are shuffled and index points to option with value 'C'
      const q = attempt.questions[0];
      const correctText = q.questionSnapshot.options[q.questionSnapshot.correctOptionIndex];
      expect(correctText).toBe('C');
      expect(mockSave).toHaveBeenCalled();
    });
    it('should exclude previously correct questions when excludePreviouslyCorrect is enabled', async () => {
      mockFindById.mockResolvedValue({
        _id: 'config-1',
        active: true,
        maxAttempts: 0,
        moduleFilter: [],
        questionCount: 3,
        excludePreviouslyCorrect: true,
      });

      // 5 questions in DB: q1/correct, q2/incorrect, q3/no_respondida, q4/correct, q5/incorrect
      const mockQuestions = [
        { _id: 'q1', questionText: 'Q1 Already Correct', options: ['A', 'B'], difficulty: 'easy', correctOptionIndex: 0 },
        { _id: 'q2', questionText: 'Q2 Incorrect', options: ['C', 'D'], difficulty: 'medium', correctOptionIndex: 0 },
        { _id: 'q3', questionText: 'Q3 No respondida', options: ['E', 'F'], difficulty: 'hard', correctOptionIndex: 0 },
        { _id: 'q4', questionText: 'Q4 Already Correct', options: ['G', 'H'], difficulty: 'easy', correctOptionIndex: 0 },
        { _id: 'q5', questionText: 'Q5 Incorrect', options: ['I', 'J'], difficulty: 'medium', correctOptionIndex: 0 },
      ];

      mockFind.mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockQuestions),
      } as any);

      // Mock ExamAttempt.find for previous attempts (implementation does NOT use .lean() here)
      // Must use mockResolvedValue (thenable) not mockReturnValue({ lean: ... })
      mockAttemptFind.mockResolvedValue([
        {
          _id: 'prev-attempt-1',
          userId: 'u1',
          examConfigId: 'config-1',
          status: 'completed',
          questions: [
            { questionId: 'q1', status: 'correcta' },
            { questionId: 'q2', status: 'incorrecta' },
            { questionId: 'q3', status: 'no_respondida' },
          ],
        },
        {
          _id: 'prev-attempt-2',
          userId: 'u1',
          examConfigId: 'config-1',
          status: 'completed',
          questions: [
            { questionId: 'q4', status: 'correcta' },
            { questionId: 'q5', status: 'incorrecta' },
          ],
        },
      ]);

      mockCreate.mockImplementation(async (data: any) => ({
        _id: 'attempt-exclude',
        questions: data.questions,
        save: vi.fn().mockResolvedValue(true),
      }));

      const attempt = await QuizService.createExamAttempt('u1', 't1', 'config-1');

      // Should NOT include q1 and q4 (correctly answered)
      const questionIds = attempt.questions.map((q: any) => q.questionId);
      expect(questionIds).not.toContain('q1');
      expect(questionIds).not.toContain('q4');
      // Should include q2, q3, q5 (not previously correct)
      expect(questionIds).toContain('q2');
      expect(questionIds).toContain('q3');
      expect(questionIds).toContain('q5');
      // Should have 3 questions (config questionCount)
      expect(attempt.questions).toHaveLength(3);
    });

    it('should throw when excludePreviouslyCorrect leaves no remaining questions', async () => {
      mockFindById.mockResolvedValue({
        _id: 'config-1',
        active: true,
        maxAttempts: 0,
        moduleFilter: [],
        questionCount: 3,
        excludePreviouslyCorrect: true,
      });

      const mockQuestions = [
        { _id: 'q1', questionText: 'Q1', options: ['A', 'B'], difficulty: 'easy', correctOptionIndex: 0 },
        { _id: 'q2', questionText: 'Q2', options: ['C', 'D'], difficulty: 'medium', correctOptionIndex: 0 },
      ];

      mockFind.mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockQuestions),
      } as any);

      // Both q1 and q2 were correctly answered before — all available questions are excluded
      mockAttemptFind.mockResolvedValue([
        {
          _id: 'prev-attempt',
          userId: 'u1',
          examConfigId: 'config-1',
          status: 'completed',
          questions: [
            { questionId: 'q1', status: 'correcta' },
            { questionId: 'q2', status: 'correcta' },
          ],
        },
      ]);

      await expect(
        QuizService.createExamAttempt('u1', 't1', 'config-1')
      ).rejects.toThrow('Ya has acertado todas las preguntas disponibles');
    });
  });

    it('should perform adaptive weighted selection when adaptiveQuestionSelection is enabled', async () => {
      mockFindById.mockResolvedValue({
        _id: 'config-adaptive',
        active: true,
        maxAttempts: 0,
        moduleFilter: [],
        questionCount: 3,
        adaptiveQuestionSelection: true,
      });

      // Questions from 2 modules, each with some correct/incorrect in history
      const mockQuestions = [
        { _id: 'q_weak_mod', questionText: 'Weak Module Q1', options: ['A', 'B'], difficulty: 'easy', module: 'Módulo Débil', correctOptionIndex: 0 },
        { _id: 'q_weak_mod2', questionText: 'Weak Module Q2', options: ['C', 'D'], difficulty: 'hard', module: 'Módulo Débil', correctOptionIndex: 0 },
        { _id: 'q_weak_mod3', questionText: 'Weak Module Q3', options: ['E', 'F'], difficulty: 'medium', module: 'Módulo Débil', correctOptionIndex: 0 },
        { _id: 'q_strong_mod', questionText: 'Strong Module Q1', options: ['G', 'H'], difficulty: 'easy', module: 'Módulo Fuerte', correctOptionIndex: 0 },
        { _id: 'q_strong_mod2', questionText: 'Strong Module Q2', options: ['I', 'J'], difficulty: 'hard', module: 'Módulo Fuerte', correctOptionIndex: 0 },
      ];

      mockFind.mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockQuestions),
      } as any);

      // Historical data: user is weak on 'Módulo Débil' (0% correct) and strong on 'Módulo Fuerte' (100% correct)
      mockAttemptFind.mockResolvedValue([
        {
          _id: 'prev-attempt',
          userId: 'u1',
          examConfigId: 'config-adaptive',
          status: 'completed',
          questions: [
            { questionId: 'q_weak_mod', status: 'incorrecta', questionSnapshot: { module: 'Módulo Débil', difficulty: 'easy' } },
            { questionId: 'q_strong_mod', status: 'correcta', questionSnapshot: { module: 'Módulo Fuerte', difficulty: 'easy' } },
            { questionId: 'q_strong_mod2', status: 'correcta', questionSnapshot: { module: 'Módulo Fuerte', difficulty: 'hard' } },
          ],
        },
      ]);

      mockCreate.mockImplementation(async (data: any) => ({
        _id: 'attempt-adaptive',
        questions: data.questions,
        save: vi.fn().mockResolvedValue(true),
      }));

      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.01);
      const attempt = await QuizService.createExamAttempt('u1', 't1', 'config-adaptive');
      randomSpy.mockRestore();

      expect(attempt.questions).toHaveLength(3);
      // All 3 weak module questions should be selected (higher weight)
      const questionIds = attempt.questions.map((q: any) => q.questionId);
      const weakCount = questionIds.filter((id: string) =>
        id === 'q_weak_mod' || id === 'q_weak_mod2' || id === 'q_weak_mod3'
      ).length;
      // With 3 slots and weak module having much higher weight, expect at least 2 weak module questions
      expect(weakCount).toBeGreaterThanOrEqual(2);
    });

    it('should fall back to random selection when adaptive is enabled but no history exists', async () => {
      mockFindById.mockResolvedValue({
        _id: 'config-adaptive-no-history',
        active: true,
        maxAttempts: 0,
        moduleFilter: [],
        questionCount: 2,
        adaptiveQuestionSelection: true,
      });

      const mockQuestions = [
        { _id: 'q1', questionText: 'Q1', options: ['A', 'B'], difficulty: 'easy', module: 'Mod1', correctOptionIndex: 0 },
        { _id: 'q2', questionText: 'Q2', options: ['C', 'D'], difficulty: 'medium', module: 'Mod1', correctOptionIndex: 0 },
        { _id: 'q3', questionText: 'Q3', options: ['E', 'F'], difficulty: 'hard', module: 'Mod2', correctOptionIndex: 0 },
      ];

      mockFind.mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockQuestions),
      } as any);

      // No previous attempts
      mockAttemptFind.mockResolvedValue([]);

      mockCreate.mockImplementation(async (data: any) => ({
        _id: 'attempt-adaptive-no-history',
        questions: data.questions,
        save: vi.fn().mockResolvedValue(true),
      }));

      const attempt = await QuizService.createExamAttempt('u1', 't1', 'config-adaptive-no-history');

      expect(attempt.questions).toHaveLength(2);
      // Should have selected 2 of 3 questions
      const questionIds = attempt.questions.map((q: any) => q.questionId);
      expect(questionIds.length).toBe(2);
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
        attemptTokenExpiresAt: new Date(Date.now() - 10000), // Expired
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
      mockFindOne.mockReturnValue({
        populate: mockPopulate,
      } as any);

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
          { status: 'correcta', isCorrect: true, questionSnapshot: { difficulty: 'easy' } }, // +2
          { status: 'incorrecta', isCorrect: false, questionSnapshot: { difficulty: 'medium' } }, // -0.5
          { status: 'no_respondida', isCorrect: false, questionSnapshot: { difficulty: 'hard' } }, // +0
        ],
        save: mockSave,
      };

      const mockPopulate = vi.fn().mockResolvedValue(mockAttempt);
      mockFindOne.mockReturnValue({
        populate: mockPopulate,
      } as any);

      const result = await QuizService.finishExam('attempt-finish', 'user-1');

      expect(mockFindOne).toHaveBeenCalledWith({ _id: 'attempt-finish', userId: 'user-1' });
      expect(result.status).toBe('completed');
      expect(result.endedAt).toBeInstanceOf(Date);
      expect(result.score).toBe(1.5); // 2 - 0.5 = 1.5
      expect(result.percentage).toBe(25); // 1.5 / 6 (max possible: 3 questions * 2 points = 6) * 100 = 25%
      expect(mockSave).toHaveBeenCalled();
    });

    it('should handle weighted scoring correctly using difficultyWeights', async () => {
      const mockSave = vi.fn().mockResolvedValue(true);
      const mockAttempt = {
        _id: 'attempt-finish-weighted',
        status: 'in_progress',
        examConfigId: {
          scoringMode: 'weighted',
          difficultyWeights: {
            easy: 1,
            medium: 2,
            hard: 5,
          },
        },
        questions: [
          { status: 'correcta', isCorrect: true, questionSnapshot: { difficulty: 'easy' } }, // +1
          { status: 'correcta', isCorrect: true, questionSnapshot: { difficulty: 'medium' } }, // +2
          { status: 'incorrecta', isCorrect: false, questionSnapshot: { difficulty: 'hard' } }, // 0
        ],
        save: mockSave,
      };

      const mockPopulate = vi.fn().mockResolvedValue(mockAttempt);
      mockFindOne.mockReturnValue({
        populate: mockPopulate,
      } as any);

      const result = await QuizService.finishExam('attempt-finish-weighted', 'user-1');

      expect(result.score).toBe(3); // 1 + 2 = 3
      expect(result.percentage).toBe(37.5); // 3 / 8 (max possible: 1 + 2 + 5 = 8) * 100 = 37.5%
    });
  });
});
