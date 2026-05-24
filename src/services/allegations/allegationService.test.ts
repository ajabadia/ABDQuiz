import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AllegationService } from './allegationService';
import mongoose from 'mongoose';

// 1. Mock DB connection module
vi.mock('@/lib/database/mongodb', () => {
  return {
    default: vi.fn().mockResolvedValue(null),
  };
});

// 2. Mock Mongoose models
vi.mock('@/models/Allegation', () => {
  const mockCreate = vi.fn();
  const mockFind = vi.fn();
  const mockFindById = vi.fn();
  class MockAllegation {
    static create = mockCreate;
    static find = mockFind;
    static findById = mockFindById;
  }
  return {
    default: MockAllegation,
    mockCreate,
    mockFind,
    mockFindById,
  };
});

vi.mock('@/models/ExamAttempt', () => {
  const mockFind = vi.fn();
  const mockFindById = vi.fn();
  class MockExamAttempt {
    static find = mockFind;
    static findById = mockFindById;
  }
  return {
    default: MockExamAttempt,
    mockFind,
    mockFindById,
  };
});

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
  const mockUpdateOne = vi.fn();
  class MockQuestion {
    static updateOne = mockUpdateOne;
  }
  return {
    default: MockQuestion,
    mockUpdateOne,
  };
});

// Import mock references
import { mockCreate as mockCreateAllegation, mockFind as mockFindAllegation, mockFindById as mockFindByIdAllegation } from '@/models/Allegation';
import { mockFind as mockFindAttempt, mockFindById as mockFindByIdAttempt } from '@/models/ExamAttempt';
import { mockFindById as mockFindByIdConfig } from '@/models/ExamConfig';
import { mockUpdateOne as mockUpdateOneQuestion } from '@/models/Question';

describe('AllegationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('submitAllegation', () => {
    it('should throw an error if the exam attempt is not found', async () => {
      mockFindByIdAttempt.mockResolvedValue(null);

      await expect(
        AllegationService.submitAllegation('u1', 't1', 'u@a.com', 'User', 'attempt-invalid', 'q1', 'reason')
      ).rejects.toThrow('Intento de examen no encontrado');
    });

    it('should throw an error if the question does not belong to the attempt', async () => {
      mockFindByIdAttempt.mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        questions: [{ questionId: '507f1f77bcf86cd799439013' }],
      });

      await expect(
        AllegationService.submitAllegation('u1', 't1', 'u@a.com', 'User', '507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012', 'reason')
      ).rejects.toThrow('La pregunta no pertenece a este intento de examen');
    });

    it('should create allegation successfully when attempt and question match', async () => {
      mockFindByIdAttempt.mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        questions: [
          {
            questionId: '507f1f77bcf86cd799439012',
            questionSnapshot: {
              questionText: '¿Cuál es la capital de España?',
            },
          },
        ],
      });

      const mockAllegationDoc = { _id: 'allegation-1' };
      mockCreateAllegation.mockResolvedValue(mockAllegationDoc);

      const result = await AllegationService.submitAllegation(
        'u1',
        't1',
        'u@a.com',
        'User',
        '507f1f77bcf86cd799439011',
        '507f1f77bcf86cd799439012',
        'Incorrect answer index'
      );

      expect(mockCreateAllegation).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 't1',
          userId: 'u1',
          userEmail: 'u@a.com',
          userName: 'User',
          questionText: '¿Cuál es la capital de España?',
          reason: 'Incorrect answer index',
          status: 'pending',
        })
      );
      expect(result).toEqual(mockAllegationDoc);
    });
  });

  describe('rejectAllegation', () => {
    it('should throw an error if allegation does not exist or is not pending', async () => {
      mockFindByIdAllegation.mockResolvedValue(null);

      await expect(
        AllegationService.rejectAllegation('al-1', 'rejection feedback', 'admin-1')
      ).rejects.toThrow('Reclamación no encontrada o ya procesada');
    });

    it('should update status to rejected and save feedback details', async () => {
      const mockSave = vi.fn().mockResolvedValue(true);
      const mockAllegation = {
        _id: 'al-pending',
        status: 'pending',
        save: mockSave,
      };

      mockFindByIdAllegation.mockResolvedValue(mockAllegation);

      const result = await AllegationService.rejectAllegation('al-pending', 'Not valid reasons', 'admin-1');

      expect(mockAllegation.status).toBe('rejected');
      expect((mockAllegation as any).feedback).toBe('Not valid reasons');
      expect((mockAllegation as any).resolvedBy).toBe('admin-1');
      expect((mockAllegation as any).resolvedAt).toBeInstanceOf(Date);
      expect(mockSave).toHaveBeenCalled();
      expect(result).toEqual(mockAllegation);
    });
  });

  describe('resolveAllegation', () => {
    const allegationId = 'al-123';
    const qIdStr = '507f1f77bcf86cd799439011';
    const tenantId = 't1';

    let mockAllegation: any;
    let mockSaveAllegation: any;

    beforeEach(() => {
      mockSaveAllegation = vi.fn().mockResolvedValue(true);
      mockAllegation = {
        _id: allegationId,
        tenantId,
        questionId: new mongoose.Types.ObjectId(qIdStr),
        status: 'pending',
        save: mockSaveAllegation,
      };
      mockFindByIdAllegation.mockResolvedValue(mockAllegation);
    });

    it('should handle CORRECTION_SHIFT and recalculate scores for completed attempts', async () => {
      const mockSaveAttempt = vi.fn().mockResolvedValue(true);
      const mockMarkModified = vi.fn();
      
      const mockAttempt = {
        _id: 'attempt-1',
        status: 'completed',
        examConfigId: 'config-1',
        questions: [
          {
            questionId: qIdStr,
            selectedOptionIndex: 2, // Shifted to correct
            isCorrect: false,
            status: 'incorrecta',
            questionSnapshot: {
              difficulty: 'easy',
              correctOptionIndex: 0, // Old correct option index
            },
          },
        ],
        markModified: mockMarkModified,
        save: mockSaveAttempt,
      };

      mockFindAttempt.mockResolvedValue([mockAttempt]);
      mockUpdateOneQuestion.mockResolvedValue({ modifiedCount: 1 });
      
      mockFindByIdConfig.mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          scoringMode: 'simple',
          pointsPerCorrect: 1,
        }),
      } as any);

      const result = await AllegationService.resolveAllegation(
        allegationId,
        'CORRECTION_SHIFT',
        'Valid Shift',
        'admin-1',
        2 // New correct option index
      );

      // Verify Question db was updated
      expect(mockUpdateOneQuestion).toHaveBeenCalledWith(
        { _id: mockAllegation.questionId },
        { $set: { correctOptionIndex: 2 } }
      );

      // Verify Attempt Question block was updated
      const qBlock = mockAttempt.questions[0];
      expect(qBlock.questionSnapshot.correctOptionIndex).toBe(2);
      expect(qBlock.isCorrect).toBe(true);
      expect(qBlock.status).toBe('correcta');

      // Verify Recalculation
      expect((mockAttempt as any).score).toBe(1);
      expect((mockAttempt as any).percentage).toBe(100);

      expect(mockMarkModified).toHaveBeenCalledWith('questions');
      expect(mockSaveAttempt).toHaveBeenCalled();

      // Verify Allegation state
      expect(mockAllegation.status).toBe('approved');
      expect(mockAllegation.resolution).toBe('CORRECTION_SHIFT');
      expect(mockSaveAllegation).toHaveBeenCalled();

      expect(result).toEqual(mockAllegation);
    });

    it('should handle CANCEL_QUESTION deactivating question and adjusting scoring', async () => {
      const mockSaveAttempt = vi.fn().mockResolvedValue(true);
      const mockAttempt = {
        _id: 'attempt-2',
        status: 'completed',
        examConfigId: 'config-1',
        questions: [
          {
            questionId: qIdStr,
            selectedOptionIndex: 0,
            isCorrect: true, // Used to be correct
            status: 'correcta',
            questionSnapshot: {
              difficulty: 'easy',
              correctOptionIndex: 0,
            },
          },
          {
            questionId: 'other-q',
            selectedOptionIndex: 1,
            isCorrect: true,
            status: 'correcta',
            questionSnapshot: {
              difficulty: 'easy',
              correctOptionIndex: 1,
            },
          },
        ],
        markModified: vi.fn(),
        save: mockSaveAttempt,
      };

      mockFindAttempt.mockResolvedValue([mockAttempt]);
      
      mockFindByIdConfig.mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          scoringMode: 'simple',
          pointsPerCorrect: 1,
        }),
      } as any);

      await AllegationService.resolveAllegation(
        allegationId,
        'CANCEL_QUESTION',
        'Defective question content',
        'admin-1'
      );

      // Verify Question deactivated
      expect(mockUpdateOneQuestion).toHaveBeenCalledWith(
        { _id: mockAllegation.questionId },
        { $set: { active: false } }
      );

      // Verify Question Snapshot is cancelled
      const qBlock = mockAttempt.questions[0];
      expect(qBlock.questionSnapshot.isCancelled).toBe(true);
      expect(qBlock.isCorrect).toBe(false);
      expect(qBlock.status).toBe('no_respondida');

      // Score recalculation should ignore the cancelled question
      // Remaining correct questions: 1. Max possible questions: 1.
      expect((mockAttempt as any).score).toBe(1);
      expect((mockAttempt as any).percentage).toBe(100);
      expect(mockSaveAttempt).toHaveBeenCalled();
    });

    it('should handle GIVE_POINTS_TO_ALL awarding points to all target attempts', async () => {
      const mockSaveAttempt = vi.fn().mockResolvedValue(true);
      const mockAttempt = {
        _id: 'attempt-3',
        status: 'completed',
        examConfigId: 'config-1',
        questions: [
          {
            questionId: qIdStr,
            selectedOptionIndex: null, // Did not answer
            isCorrect: false,
            status: 'no_respondida',
            questionSnapshot: {
              difficulty: 'easy',
              correctOptionIndex: 0,
            },
          },
        ],
        markModified: vi.fn(),
        save: mockSaveAttempt,
      };

      mockFindAttempt.mockResolvedValue([mockAttempt]);

      mockFindByIdConfig.mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          scoringMode: 'simple',
          pointsPerCorrect: 1,
        }),
      } as any);

      await AllegationService.resolveAllegation(
        allegationId,
        'GIVE_POINTS_TO_ALL',
        'Ambiguous wording',
        'admin-1'
      );

      const qBlock = mockAttempt.questions[0];
      expect(qBlock.isCorrect).toBe(true);
      expect(qBlock.status).toBe('correcta');
      expect((mockAttempt as any).score).toBe(1);
      expect((mockAttempt as any).percentage).toBe(100);
    });
  });

  describe('getTenantAllegations', () => {
    it('should query allegations by tenantId sorted descending', async () => {
      const mockAllegations = [{ _id: 'a1' }, { _id: 'a2' }];
      const mockSort = vi.fn().mockResolvedValue(mockAllegations);
      mockFindAllegation.mockReturnValue({
        sort: mockSort,
      } as any);

      const result = await AllegationService.getTenantAllegations('tenant-1');

      expect(mockFindAllegation).toHaveBeenCalledWith({ tenantId: 'tenant-1' });
      expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual(mockAllegations);
    });
  });
});
