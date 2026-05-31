import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AllegationService } from './allegationService';
import mongoose from 'mongoose';

// ── Mocks (hoisted by vitest) ───────────────
vi.mock('@ajabadia/satellite-sdk', () => ({ connectDB: vi.fn().mockResolvedValue(undefined) }));

vi.mock('@/models/Allegation', () => {
  const mockCreate = vi.fn();
  const mockFind = vi.fn();
  const mockFindById = vi.fn();
  class MockAllegation { static create = mockCreate; static find = mockFind; static findById = mockFindById; }
  return { default: MockAllegation, mockCreate, mockFind, mockFindById };
});

vi.mock('@/models/ExamAttempt', () => {
  const mockFind = vi.fn();
  const mockFindById = vi.fn();
  class MockExamAttempt { static find = mockFind; static findById = mockFindById; }
  return { default: MockExamAttempt, mockFind, mockFindById };
});

vi.mock('@/models/ExamConfig', () => {
  const mockFindById = vi.fn();
  class MockExamConfig { static findById = mockFindById; }
  return { default: MockExamConfig, mockFindById };
});

vi.mock('@/models/Question', () => {
  const mockUpdateOne = vi.fn();
  class MockQuestion { static updateOne = mockUpdateOne; }
  return { default: MockQuestion, mockUpdateOne };
});

// ── Import mock refs ─────────────────────
import * as AllegationMod from '@/models/Allegation';
import * as ExamAttemptMod from '@/models/ExamAttempt';
import * as ExamConfigMod from '@/models/ExamConfig';
import * as QuestionMod from '@/models/Question';

const { mockCreate: mockCreateAllegation, mockFind: mockFindAllegation, mockFindById: mockFindByIdAllegation } = AllegationMod as unknown as any;
const { mockFind: mockFindAttempt, mockFindById: mockFindByIdAttempt } = ExamAttemptMod as unknown as any;
const { mockFindById: mockFindByIdConfig } = ExamConfigMod as unknown as any;
const { mockUpdateOne: mockUpdateOneQuestion } = QuestionMod as unknown as any;

describe('AllegationService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('submitAllegation', () => {
    it('should throw if exam attempt not found', async () => {
      mockFindByIdAttempt.mockResolvedValue(null);
      await expect(AllegationService.submitAllegation('u1', 't1', 'u@a.com', 'User', 'attempt-invalid', 'q1', 'reason'))
        .rejects.toThrow('Intento de examen no encontrado');
    });

    it('should throw if question does not belong to attempt', async () => {
      mockFindByIdAttempt.mockResolvedValue({ _id: '507f1f77bcf86cd799439011', questions: [{ questionId: '507f1f77bcf86cd799439013' }] });
      await expect(AllegationService.submitAllegation('u1', 't1', 'u@a.com', 'User', '507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012', 'reason'))
        .rejects.toThrow('La pregunta no pertenece a este intento de examen');
    });

    it('should create allegation successfully', async () => {
      mockFindByIdAttempt.mockResolvedValue({ _id: '507f1f77bcf86cd799439011', questions: [{ questionId: '507f1f77bcf86cd799439012', questionSnapshot: { questionText: '¿Capital de España?' } }] });
      mockCreateAllegation.mockResolvedValue({ _id: 'allegation-1' });
      const result = await AllegationService.submitAllegation('u1', 't1', 'u@a.com', 'User', '507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012', 'Incorrect answer index');
      expect(mockCreateAllegation).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 't1', questionText: '¿Capital de España?', reason: 'Incorrect answer index', status: 'pending' }));
      expect(result).toEqual({ _id: 'allegation-1' });
    });
  });

  describe('rejectAllegation', () => {
    it('should throw if allegation not pending', async () => {
      mockFindByIdAllegation.mockResolvedValue(null);
      await expect(AllegationService.rejectAllegation('al-1', 'feedback', 'admin-1')).rejects.toThrow('Reclamación no encontrada o ya procesada');
    });

    it('should reject and save', async () => {
      const mockSave = vi.fn().mockResolvedValue(true);
      mockFindByIdAllegation.mockResolvedValue({ _id: 'al-pending', status: 'pending', save: mockSave });
      const result = await AllegationService.rejectAllegation('al-pending', 'Not valid reasons', 'admin-1');
      expect(result.status).toBe('rejected');
      expect(mockSave).toHaveBeenCalled();
    });
  });

  describe('resolveAllegation', () => {
    const allegationId = 'al-123';
    const qIdStr = '507f1f77bcf86cd799439011';
    let mockAllegation: any;
    beforeEach(() => {
      mockAllegation = { _id: allegationId, tenantId: 't1', questionId: new mongoose.Types.ObjectId(qIdStr), status: 'pending', save: vi.fn().mockResolvedValue(true) };
      mockFindByIdAllegation.mockResolvedValue(mockAllegation);
    });

    it('should handle CORRECTION_SHIFT', async () => {
      const mockAttempt = { _id: 'a1', status: 'completed', examConfigId: 'cfg1', questions: [{ questionId: qIdStr, selectedOptionIndex: 2, isCorrect: false, status: 'incorrecta', questionSnapshot: { difficulty: 'easy', correctOptionIndex: 0 } }], markModified: vi.fn(), save: vi.fn().mockResolvedValue(true) };
      mockFindAttempt.mockResolvedValue([mockAttempt]);
      mockUpdateOneQuestion.mockResolvedValue({ modifiedCount: 1 });
      mockFindByIdConfig.mockReturnValue({ lean: vi.fn().mockResolvedValue({ scoringMode: 'simple', pointsPerCorrect: 1 }) } as any);
      await AllegationService.resolveAllegation(allegationId, 'CORRECTION_SHIFT', 'Valid Shift', 'admin-1', 2);
      expect(mockAttempt.questions[0].isCorrect).toBe(true);
      expect(mockAllegation.status).toBe('approved');
    });

    it('should handle CANCEL_QUESTION', async () => {
      const mockAttempt = { _id: 'a2', status: 'completed', examConfigId: 'cfg1', questions: [{ questionId: qIdStr, selectedOptionIndex: 0, isCorrect: true, status: 'correcta', questionSnapshot: { difficulty: 'easy', correctOptionIndex: 0, isCancelled: false } }, { questionId: 'other', selectedOptionIndex: 1, isCorrect: true, status: 'correcta', questionSnapshot: { difficulty: 'easy', correctOptionIndex: 1 } }], markModified: vi.fn(), save: vi.fn().mockResolvedValue(true) };
      mockFindAttempt.mockResolvedValue([mockAttempt]);
      mockFindByIdConfig.mockReturnValue({ lean: vi.fn().mockResolvedValue({ scoringMode: 'simple', pointsPerCorrect: 1 }) } as any);
      await AllegationService.resolveAllegation(allegationId, 'CANCEL_QUESTION', 'Defective', 'admin-1');
      expect(mockAttempt.questions[0].questionSnapshot.isCancelled).toBe(true);
    });

    it('should handle GIVE_POINTS_TO_ALL', async () => {
      const mockAttempt = { _id: 'a3', status: 'completed', examConfigId: 'cfg1', questions: [{ questionId: qIdStr, selectedOptionIndex: null, isCorrect: false, status: 'no_respondida', questionSnapshot: { difficulty: 'easy', correctOptionIndex: 0 } }], markModified: vi.fn(), save: vi.fn().mockResolvedValue(true) };
      mockFindAttempt.mockResolvedValue([mockAttempt]);
      mockFindByIdConfig.mockReturnValue({ lean: vi.fn().mockResolvedValue({ scoringMode: 'simple', pointsPerCorrect: 1 }) } as any);
      await AllegationService.resolveAllegation(allegationId, 'GIVE_POINTS_TO_ALL', 'Ambiguous', 'admin-1');
      expect(mockAttempt.questions[0].isCorrect).toBe(true);
    });
  });

  describe('getTenantAllegations', () => {
    it('should query by tenantId sorted descending', async () => {
      mockFindAllegation.mockReturnValue({ sort: vi.fn().mockResolvedValue([{ _id: 'a1' }]) } as any);
      const result = await AllegationService.getTenantAllegations('tenant-1');
      expect(result).toEqual([{ _id: 'a1' }]);
    });
  });
});
