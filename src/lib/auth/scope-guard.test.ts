import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireQuizScope, assertQuizScope, QuizScopeDeniedError } from './scope-guard';

// Mock the Mongoose model QuizUserRole
vi.mock('@/models/QuizUserRole', () => {
  const mockFindOne = vi.fn();
  class MockQuizUserRole {
    static findOne = mockFindOne;
  }
  return {
    default: MockQuizUserRole,
    mockFindOne,
  };
});

import * as QuizUserRoleMod from '@/models/QuizUserRole';
const { mockFindOne } = QuizUserRoleMod as unknown as { mockFindOne: ReturnType<typeof vi.fn> };

describe('scope-guard - Ecosistema de Aprendizaje', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('requireQuizScope', () => {
    it('should return granted: false if no role mapping exists', async () => {
      mockFindOne.mockResolvedValue(null);

      const result = await requireQuizScope('u1', 't1', 's1', 'course', 'RECIPIENT');

      expect(result).toEqual({ granted: false, roleType: null });
      expect(mockFindOne).toHaveBeenCalledWith({
        userId: 'u1',
        tenantId: 't1',
        scopeId: 's1',
        scopeType: 'course',
      });
    });

    it('should grant access to CREATOR for any requested role (Bypass Hierárquico)', async () => {
      mockFindOne.mockResolvedValue({
        userId: 'u1',
        tenantId: 't1',
        scopeId: 's1',
        scopeType: 'course',
        roleType: 'CREATOR',
      });

      const resCreator = await requireQuizScope('u1', 't1', 's1', 'course', 'CREATOR');
      const resRecipient = await requireQuizScope('u1', 't1', 's1', 'course', 'RECIPIENT');
      const resAuditor = await requireQuizScope('u1', 't1', 's1', 'course', 'AUDITOR');

      expect(resCreator.granted).toBe(true);
      expect(resRecipient.granted).toBe(true);
      expect(resAuditor.granted).toBe(true);
      
      expect(resCreator.roleType).toBe('CREATOR');
    });

    it('should grant access for RECIPIENT only if requiredRole matches exactly', async () => {
      mockFindOne.mockResolvedValue({
        userId: 'u2',
        tenantId: 't1',
        scopeId: 's1',
        scopeType: 'course',
        roleType: 'RECIPIENT',
      });

      const resCreatorReq = await requireQuizScope('u2', 't1', 's1', 'course', 'CREATOR');
      const resRecipientReq = await requireQuizScope('u2', 't1', 's1', 'course', 'RECIPIENT');
      const resAuditorReq = await requireQuizScope('u2', 't1', 's1', 'course', 'AUDITOR');

      expect(resCreatorReq.granted).toBe(false);
      expect(resRecipientReq.granted).toBe(true);
      expect(resAuditorReq.granted).toBe(false);
    });

    it('should grant access for AUDITOR only if requiredRole matches exactly', async () => {
      mockFindOne.mockResolvedValue({
        userId: 'u3',
        tenantId: 't1',
        scopeId: 's1',
        scopeType: 'space',
        roleType: 'AUDITOR',
      });

      const resCreatorReq = await requireQuizScope('u3', 't1', 's1', 'space', 'CREATOR');
      const resRecipientReq = await requireQuizScope('u3', 't1', 's1', 'space', 'RECIPIENT');
      const resAuditorReq = await requireQuizScope('u3', 't1', 's1', 'space', 'AUDITOR');

      expect(resCreatorReq.granted).toBe(false);
      expect(resRecipientReq.granted).toBe(false);
      expect(resAuditorReq.granted).toBe(true);
    });
  });

  describe('assertQuizScope', () => {
    it('should resolve normally if the role matches', async () => {
      mockFindOne.mockResolvedValue({
        userId: 'u1',
        tenantId: 't1',
        scopeId: 's1',
        scopeType: 'course',
        roleType: 'RECIPIENT',
      });

      await expect(
        assertQuizScope('u1', 't1', 's1', 'course', 'RECIPIENT')
      ).resolves.not.toThrow();
    });

    it('should throw QuizScopeDeniedError if the role does not match or is missing', async () => {
      mockFindOne.mockResolvedValue(null);

      await expect(
        assertQuizScope('u1', 't1', 's1', 'course', 'CREATOR')
      ).rejects.toThrowError(QuizScopeDeniedError);
    });
  });
});
