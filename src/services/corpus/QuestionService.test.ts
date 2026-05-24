import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QuestionService } from './QuestionService';

// 1. Mock connection module
vi.mock('@/lib/database/mongodb', () => {
  return {
    default: vi.fn().mockResolvedValue(null),
  };
});

// 2. Mock Mongoose models
vi.mock('@/models/Question', () => {
  const mockFind = vi.fn();
  const mockCountDocuments = vi.fn();
  const mockFindById = vi.fn();
  const mockFindByIdAndUpdate = vi.fn();
  const mockCreate = vi.fn();

  class MockQuestion {
    static find = mockFind;
    static countDocuments = mockCountDocuments;
    static findById = mockFindById;
    static findByIdAndUpdate = mockFindByIdAndUpdate;
    static create = mockCreate;
  }
  return {
    default: MockQuestion,
    mockFind,
    mockCountDocuments,
    mockFindById,
    mockFindByIdAndUpdate,
    mockCreate,
  };
});

vi.mock('@/models/ExamAttempt', () => {
  const mockCountDocuments = vi.fn();
  class MockExamAttempt {
    static countDocuments = mockCountDocuments;
  }
  return {
    default: MockExamAttempt,
    mockCountDocuments,
  };
});

import { mockFind, mockCountDocuments as mockQuestionCount, mockFindById, mockFindByIdAndUpdate, mockCreate } from '@/models/Question';
import { mockCountDocuments as mockAttemptCount } from '@/models/ExamAttempt';

describe('QuestionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getQuestions', () => {
    it('should return paginated and filtered questions correctly', async () => {
      const mockQuestions = [
        { _id: 'q1', questionText: 'P1', active: true, difficulty: 'medium', module: 'ModA' },
      ];
      const mockLeanFind = vi.fn().mockResolvedValue(mockQuestions);
      const mockSort = vi.fn().mockReturnThis();
      const mockSkip = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockReturnValue({
        lean: mockLeanFind,
      } as any);

      mockFind.mockReturnValue({
        sort: mockSort,
        skip: mockSkip,
        limit: mockLimit,
      } as any);

      mockQuestionCount.mockResolvedValue(25);

      const result = await QuestionService.getQuestions('tenant-1', {
        page: 2,
        limit: 10,
        active: true,
        module: 'ModA',
        difficulty: 'medium',
        search: 'test',
      });

      expect(mockFind).toHaveBeenCalledWith({
        tenantId: 'tenant-1',
        active: true,
        module: 'ModA',
        difficulty: 'medium',
        questionText: { $regex: 'test', $options: 'i' },
      });

      expect(mockSort).toHaveBeenCalledWith({ updatedAt: -1 });
      expect(mockSkip).toHaveBeenCalledWith(10);
      expect(mockLimit).toHaveBeenCalledWith(10);

      expect(result).toEqual({
        questions: mockQuestions,
        total: 25,
        page: 2,
        pages: 3,
      });
    });
  });

  describe('checkTraceability', () => {
    it('should return true if question is present in any exam attempt', async () => {
      mockAttemptCount.mockResolvedValue(5);
      const result = await QuestionService.checkTraceability('q-1');
      expect(result).toBe(true);
      expect(mockAttemptCount).toHaveBeenCalledWith({
        'questions.questionId': 'q-1',
      });
    });

    it('should return false if question is not in any exam attempt', async () => {
      mockAttemptCount.mockResolvedValue(0);
      const result = await QuestionService.checkTraceability('q-2');
      expect(result).toBe(false);
    });
  });

  describe('saveQuestion', () => {
    const mockInput = {
      questionText: 'P1-updated',
      options: ['A', 'B', 'C', 'D'],
      correctOptionIndex: 1,
      explanation: 'Explanation updated',
      difficulty: 'easy' as const,
      module: 'Mod-updated',
      source: 'Source-updated',
      tags: ['tag1'],
    };

    it('should throw an error if the question does not exist', async () => {
      mockFindById.mockResolvedValue(null);

      await expect(
        QuestionService.saveQuestion('q-nonexistent', mockInput)
      ).rejects.toThrow('El reactivo especificado no existe');
    });

    it('should perform in-place update if the question is not traceable', async () => {
      const mockOldQuestion = {
        _id: 'q-untraced',
        tenantId: 'tenant-1',
        version: 1,
        active: true,
      };
      mockFindById.mockResolvedValue(mockOldQuestion);
      mockAttemptCount.mockResolvedValue(0); // Not traceable

      const mockUpdatedQuestion = { ...mockOldQuestion, ...mockInput };
      mockFindByIdAndUpdate.mockResolvedValue(mockUpdatedQuestion);

      const result = await QuestionService.saveQuestion('q-untraced', mockInput);

      expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
        'q-untraced',
        expect.objectContaining({
          ...mockInput,
          contentHash: expect.any(String),
        }),
        { new: true, runValidators: true }
      );
      expect(result).toEqual(mockUpdatedQuestion);
    });

    it('should branch question (COW) if question is traceable', async () => {
      const mockSave = vi.fn().mockResolvedValue(true);
      const mockOldQuestion = {
        _id: 'q-traced',
        tenantId: 'tenant-1',
        version: 2,
        active: true,
        originImportId: 'import-xyz',
        save: mockSave,
      };
      mockFindById.mockResolvedValue(mockOldQuestion);
      mockAttemptCount.mockResolvedValue(2); // Traceable

      const mockBranchedQuestion = {
        _id: 'q-new-version',
        tenantId: 'tenant-1',
        ...mockInput,
        version: 3,
        active: true,
        originImportId: 'import-xyz',
      };
      mockCreate.mockResolvedValue(mockBranchedQuestion);

      const result = await QuestionService.saveQuestion('q-traced', mockInput);

      expect(mockOldQuestion.active).toBe(false);
      expect(mockSave).toHaveBeenCalled();
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          ...mockInput,
          version: 3,
          active: true,
          originImportId: 'import-xyz',
          contentHash: expect.any(String),
        })
      );
      expect(result).toEqual(mockBranchedQuestion);
    });
  });
});
