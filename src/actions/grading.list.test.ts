import { describe, it, expect, vi, beforeEach } from 'vitest';
import './grading.mocks';
import { ensureAdminOrProfessor, resolveTargetTenantContext, mockFind, makeLeanAttemptWithPopulate, adminSession, superAdminSession } from './grading.mocks';

async function getActions() {
  return import('./grading');
}

describe('getAttemptsForGradingAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return unauthorized if ensureAdminOrProfessor throws', async () => {
    ensureAdminOrProfessor.mockRejectedValue(new Error('Unauthorized'));

    const { getAttemptsForGradingAction } = await getActions();
    await expect(getAttemptsForGradingAction()).rejects.toThrow('Unauthorized');
    expect(mockFind).not.toHaveBeenCalled();
  });

  it('should return all completed/timeout attempts for same-tenant ADMIN', async () => {
    ensureAdminOrProfessor.mockResolvedValue(adminSession);

    const leanDocs = [
      makeLeanAttemptWithPopulate({ _id: 'a1' }),
      makeLeanAttemptWithPopulate({ _id: 'a2', status: 'timeout' }),
    ];
    mockFind.mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(leanDocs),
    });

    const { getAttemptsForGradingAction } = await getActions();
    const result = await getAttemptsForGradingAction();

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      _id: 'a1',
      status: 'completed',
      gradingStatus: 'auto_graded',
    });
    expect(result[1]).toMatchObject({
      _id: 'a2',
      status: 'timeout',
    });
    expect(mockFind).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        status: { $in: ['completed', 'timeout'] },
      })
    );
  });

  it('should filter by gradingStatus when provided and not "all"', async () => {
    ensureAdminOrProfessor.mockResolvedValue(adminSession);

    mockFind.mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    });

    const { getAttemptsForGradingAction } = await getActions();
    await getAttemptsForGradingAction('pending_manual_review');

    expect(mockFind).toHaveBeenCalledWith(
      expect.objectContaining({
        gradingStatus: 'pending_manual_review',
      })
    );
  });

  it('should ignore gradingStatus filter when "all"', async () => {
    ensureAdminOrProfessor.mockResolvedValue(adminSession);

    mockFind.mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    });

    const { getAttemptsForGradingAction } = await getActions();
    await getAttemptsForGradingAction('all');

    const findCall = mockFind.mock.calls[0][0];
    expect(findCall.gradingStatus).toBeUndefined();
  });

  it('should use explicitCtx tenantId for SUPER_ADMIN context shift', async () => {
    ensureAdminOrProfessor.mockResolvedValue(superAdminSession);
    resolveTargetTenantContext.mockResolvedValueOnce({
      tenantId: 'tenant-2',
      dbPrefix: 't2_',
      isolationStrategy: 'COLLECTION_PREFIX',
    });

    mockFind.mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    });

    const { getAttemptsForGradingAction } = await getActions();
    await getAttemptsForGradingAction('all', 'tenant-2');

    expect(mockFind).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-2' })
    );
    expect(resolveTargetTenantContext).toHaveBeenCalledWith('tenant-2');
  });

  it('should serialize examConfigId when populated', async () => {
    ensureAdminOrProfessor.mockResolvedValue(adminSession);

    const leanDoc = makeLeanAttemptWithPopulate();
    mockFind.mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([leanDoc]),
    });

    const { getAttemptsForGradingAction } = await getActions();
    const result = await getAttemptsForGradingAction();

    expect(result[0].examConfigId).toEqual({
      _id: 'cfg-1',
      name: 'Test Config',
      passThreshold: 70,
    });
  });

  it('should handle missing optional fields gracefully', async () => {
    ensureAdminOrProfessor.mockResolvedValue(adminSession);

    const leanDoc = makeLeanAttemptWithPopulate();
    const { endedAt, gradedBy, gradedAt, ...cleanDoc } = leanDoc;

    mockFind.mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([cleanDoc]),
    });

    const { getAttemptsForGradingAction } = await getActions();
    const result = await getAttemptsForGradingAction();

    expect(result[0].endedAt).toBeUndefined();
    expect(result[0].gradedBy).toBeUndefined();
    expect(result[0].gradedAt).toBeUndefined();
  });
});
