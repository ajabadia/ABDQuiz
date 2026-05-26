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
  class MockExamAttempt {
    static countDocuments = mockCountDocuments;
    static create = mockCreate;
    static findOne = mockFindOne;
  }
  return {
    default: MockExamAttempt,
    mockCountDocuments,
    mockCreate,
    mockFindOne,
  };
});

// Import mock references
import * as ExamConfigMod from '@/models/ExamConfig';
import * as QuestionMod from '@/models/Question';
import * as ExamAttemptMod from '@/models/ExamAttempt';

const { mockFindById } = ExamConfigMod as unknown as { mockFindById: ReturnType<typeof vi.fn> };
const { mockFind } = QuestionMod as unknown as { mockFind: ReturnType<typeof vi.fn> };
const { mockCountDocuments, mockCreate, mockFindOne } = ExamAttemptMod as unknown as {
  mockCountDocuments: ReturnType<typeof vi.fn>;
  mockCreate: ReturnType<typeof vi.fn>;
  mockFindOne: ReturnType<typeof vi.fn>;
};

describe('QuizService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    it('should throw an error if attempt is not found, unauthorized, or not in progress', async () => {
      mockFindOne.mockResolvedValue(null);

      await expect(
        QuizService.submitAnswer('attempt-123', 0, 1, 10, 'incorrecta', 'user-1')
      ).rejects.toThrow('Exam attempt not found, unauthorized, or already finished');
    });
  });

  describe('finishExam', () => {
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
