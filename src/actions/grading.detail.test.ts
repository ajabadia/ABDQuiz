import { describe, it, expect, vi, beforeEach } from 'vitest';
import './grading.mocks';
import { ensureAdminOrProfessor, resolveTargetTenantContext, mockFindById, makeMongooseDoc, adminSession, superAdminSession } from './grading.mocks';

async function getActions() {
  return import('./grading');
}

describe('getAttemptDetailAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw if ensureAdminOrProfessor throws', async () => {
    ensureAdminOrProfessor.mockRejectedValue(new Error('Unauthorized'));

    const { getAttemptDetailAction } = await getActions();
    await expect(getAttemptDetailAction('attempt-1')).rejects.toThrow('Unauthorized');
    expect(mockFindById).not.toHaveBeenCalled();
  });

  it('should return attempt detail for same-tenant ADMIN', async () => {
    ensureAdminOrProfessor.mockResolvedValue(adminSession);

    const doc = makeMongooseDoc();
    mockFindById.mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(doc),
    });

    const { getAttemptDetailAction } = await getActions();
    const result = await getAttemptDetailAction('attempt-1');

    expect(result).not.toBeNull();
    expect(result!._id).toBe('attempt-1');
    expect(result!.userId).toBe('student-1');
    expect(result!.examConfigId).toEqual({ _id: 'cfg-1', name: 'Test Config' });
    expect(result!.questions).toHaveLength(2);
    expect(result!.questions[0]).toMatchObject({
      questionIndex: 0,
      questionText: 'What is 2+2?',
      isCorrect: true,
      maxPoints: 1,
    });
    expect(result!.questions[1]).toMatchObject({
      questionIndex: 1,
      questionText: 'What is 3+3?',
      isCorrect: false,
      maxPoints: 1,
    });
  });

  it('should return null for cross-tenant access by ADMIN (anti-IDOR)', async () => {
    ensureAdminOrProfessor.mockResolvedValue(adminSession);

    const doc = makeMongooseDoc({ tenantId: 'tenant-2' });
    mockFindById.mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(doc),
    });

    const { getAttemptDetailAction } = await getActions();
    const result = await getAttemptDetailAction('attempt-1');

    expect(result).toBeNull();
  });

  it('should allow SUPER_ADMIN to fetch cross-tenant detail', async () => {
    ensureAdminOrProfessor.mockResolvedValue(superAdminSession);
    resolveTargetTenantContext.mockResolvedValueOnce({
      tenantId: 'tenant-2',
      dbPrefix: 't2_',
      isolationStrategy: 'COLLECTION_PREFIX',
    });

    const doc = makeMongooseDoc({ tenantId: 'tenant-2' });
    mockFindById.mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(doc),
    });

    const { getAttemptDetailAction } = await getActions();
    const result = await getAttemptDetailAction('attempt-1', 'tenant-2');

    expect(result).not.toBeNull();
    expect(result!._id).toBe('attempt-1');
  });

  it('should return null if attempt not found', async () => {
    ensureAdminOrProfessor.mockResolvedValue(adminSession);

    mockFindById.mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(null),
    });

    const { getAttemptDetailAction } = await getActions();
    const result = await getAttemptDetailAction('nonexistent');

    expect(result).toBeNull();
  });

  it('should handle missing examConfigId gracefully', async () => {
    ensureAdminOrProfessor.mockResolvedValue(adminSession);

    const doc = makeMongooseDoc({ examConfigId: null });
    mockFindById.mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(doc),
    });

    const { getAttemptDetailAction } = await getActions();
    const result = await getAttemptDetailAction('attempt-1');

    expect(result).not.toBeNull();
    expect(result!.examConfigId).toBeUndefined();
  });

  it('should handle empty questions array', async () => {
    ensureAdminOrProfessor.mockResolvedValue(adminSession);

    const doc = makeMongooseDoc({ questions: [] });
    mockFindById.mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(doc),
    });

    const { getAttemptDetailAction } = await getActions();
    const result = await getAttemptDetailAction('attempt-1');

    expect(result).not.toBeNull();
    expect(result!.questions).toHaveLength(0);
  });

  it('should include manual grading fields when present', async () => {
    ensureAdminOrProfessor.mockResolvedValue(adminSession);

    const doc = makeMongooseDoc({
      gradingStatus: 'manually_graded',
      gradedBy: 'admin-1',
      gradedAt: new Date('2025-06-02T12:00:00Z'),
      questions: [
        {
          questionSnapshot: {
            questionText: 'Essay?',
            options: ['A'],
            correctOptionIndex: 0,
            difficulty: 'hard',
          },
          selectedOptionIndex: null,
          manualTextAnswer: 'My answer',
          manualPointsAwarded: 3,
          feedback: 'Good job',
          isCorrect: false,
          status: 'no_respondida',
          timeSpentSeconds: 120,
        },
      ],
    });
    mockFindById.mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(doc),
    });

    const { getAttemptDetailAction } = await getActions();
    const result = await getAttemptDetailAction('attempt-1');

    expect(result!.gradingStatus).toBe('manually_graded');
    expect(result!.gradedBy).toBe('admin-1');
    expect(result!.gradedAt).toBe('2025-06-02T12:00:00.000Z');
    expect(result!.questions[0].manualTextAnswer).toBe('My answer');
    expect(result!.questions[0].manualPointsAwarded).toBe(3);
    expect(result!.questions[0].feedback).toBe('Good job');
  });
});
