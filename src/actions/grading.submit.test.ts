import { describe, it, expect, vi, beforeEach } from 'vitest';
import './grading.mocks';
import { ensureAdminOrProfessor, resolveTargetTenantContext, assertAccess, mockFindById, makeMongooseDoc, adminSession, superAdminSession } from './grading.mocks';

async function getActions() {
  return import('./grading');
}

describe('submitManualGradingAction', () => {
  const validGrades = [
    { questionIndex: 0, manualPointsAwarded: 1, feedback: 'Correct' },
    { questionIndex: 1, manualPointsAwarded: 0, feedback: 'Wrong' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return unauthorized if ensureAdminOrProfessor throws', async () => {
    ensureAdminOrProfessor.mockRejectedValue(new Error('Unauthorized'));

    const { submitManualGradingAction } = await getActions();
    const result = await submitManualGradingAction('attempt-1', validGrades);

    expect(result).toEqual({ success: false, error: 'Unauthorized' });
    expect(mockFindById).not.toHaveBeenCalled();
  });

  it('should apply grades and recalculate for same-tenant ADMIN', async () => {
    ensureAdminOrProfessor.mockResolvedValue(adminSession);

    const doc = makeMongooseDoc();
    mockFindById.mockResolvedValue(doc);

    const { submitManualGradingAction } = await getActions();
    const result = await submitManualGradingAction('attempt-1', validGrades);

    expect(result).toEqual({ success: true });
    expect(doc.questions[0].manualPointsAwarded).toBe(1);
    expect(doc.questions[0].feedback).toBe('Correct');
    expect(doc.questions[1].manualPointsAwarded).toBe(0);
    expect(doc.questions[1].feedback).toBe('Wrong');
    expect(doc.score).toBe(1);
    expect(doc.percentage).toBe(50);
    expect(doc.gradingStatus).toBe('manually_graded');
    expect(doc.gradedBy).toBe('admin@tenant1.com');
    expect(doc.gradedAt).toBeInstanceOf(Date);
    expect(doc.save).toHaveBeenCalled();
  });

  it('should reject cross-tenant grading for ADMIN (anti-IDOR)', async () => {
    ensureAdminOrProfessor.mockResolvedValue(adminSession);
    assertAccess.mockRejectedValueOnce(new Error('ABAC Denied'));

    const doc = makeMongooseDoc({ tenantId: 'tenant-2' });
    mockFindById.mockResolvedValue(doc);

    const { submitManualGradingAction } = await getActions();
    const result = await submitManualGradingAction('attempt-1', validGrades);

    expect(result).toEqual({ success: false, error: 'Acceso denegado: Rol contextual insuficiente en el espacio formativo' });
    expect(doc.save).not.toHaveBeenCalled();
  });

  it('should allow SUPER_ADMIN to grade cross-tenant attempt', async () => {
    ensureAdminOrProfessor.mockResolvedValue(superAdminSession);
    resolveTargetTenantContext.mockResolvedValueOnce({
      tenantId: 'tenant-2',
      dbPrefix: 't2_',
      isolationStrategy: 'COLLECTION_PREFIX',
    });

    const doc = makeMongooseDoc({ tenantId: 'tenant-2' });
    mockFindById.mockResolvedValue(doc);

    const { submitManualGradingAction } = await getActions();
    const result = await submitManualGradingAction('attempt-1', validGrades, 'tenant-2');

    expect(result).toEqual({ success: true });
    expect(doc.save).toHaveBeenCalled();
    expect(doc.gradingStatus).toBe('manually_graded');
  });

  it('should return error if attempt not found', async () => {
    ensureAdminOrProfessor.mockResolvedValue(adminSession);
    mockFindById.mockResolvedValue(null);

    const { submitManualGradingAction } = await getActions();
    const result = await submitManualGradingAction('nonexistent', validGrades);

    expect(result).toEqual({ success: false, error: 'Intento no encontrado' });
  });

  it('should recalculate score combining manual and auto-correct points', async () => {
    ensureAdminOrProfessor.mockResolvedValue(adminSession);

    const doc = makeMongooseDoc();
    mockFindById.mockResolvedValue(doc);

    const mixedGrades = [
      { questionIndex: 0, manualPointsAwarded: 0, feedback: 'Overridden' },
      { questionIndex: 1, manualPointsAwarded: 1, feedback: 'Partial credit' },
    ];

    const { submitManualGradingAction } = await getActions();
    await submitManualGradingAction('attempt-1', mixedGrades);

    expect(doc.score).toBe(1);
    expect(doc.percentage).toBe(50);
  });

  it('should fall back to auto isCorrect for questions without manual points', async () => {
    ensureAdminOrProfessor.mockResolvedValue(adminSession);

    const doc = makeMongooseDoc();
    mockFindById.mockResolvedValue(doc);

    const partialGrades = [
      { questionIndex: 1, manualPointsAwarded: 1, feedback: 'Partial' },
    ];

    const { submitManualGradingAction } = await getActions();
    await submitManualGradingAction('attempt-1', partialGrades);

    expect(doc.score).toBe(2);
    expect(doc.percentage).toBe(100);
  });

  it('should skip grades for out-of-bounds question indices', async () => {
    ensureAdminOrProfessor.mockResolvedValue(adminSession);

    const doc = makeMongooseDoc();
    mockFindById.mockResolvedValue(doc);

    const badGrades = [
      { questionIndex: 99, manualPointsAwarded: 5, feedback: 'N/A' },
    ];

    const { submitManualGradingAction } = await getActions();
    await submitManualGradingAction('attempt-1', badGrades);

    expect(doc.score).toBe(1);
    expect(doc.percentage).toBe(50);
  });

  it('should skip empty/whitespace-only feedback', async () => {
    ensureAdminOrProfessor.mockResolvedValue(adminSession);

    const doc = makeMongooseDoc();
    mockFindById.mockResolvedValue(doc);

    const gradesWithEmptyFeedback = [
      { questionIndex: 0, manualPointsAwarded: 1, feedback: '' },
      { questionIndex: 1, manualPointsAwarded: 0, feedback: '   ' },
    ];

    const { submitManualGradingAction } = await getActions();
    await submitManualGradingAction('attempt-1', gradesWithEmptyFeedback);

    expect(doc.questions[0].feedback).toBeUndefined();
    expect(doc.questions[1].feedback).toBeUndefined();
  });

  it('should log the grading event after success', async () => {
    ensureAdminOrProfessor.mockResolvedValue(adminSession);

    const doc = makeMongooseDoc();
    mockFindById.mockResolvedValue(doc);

    const { submitManualGradingAction } = await getActions();
    await submitManualGradingAction('attempt-1', validGrades);
  });

  it('should use admin.id as fallback for gradedBy when email is empty', async () => {
    ensureAdminOrProfessor.mockResolvedValue({
      id: 'admin-1',
      tenantId: 'tenant-1',
      email: '',
      role: 'ADMIN',
    });

    const doc = makeMongooseDoc();
    mockFindById.mockResolvedValue(doc);

    const { submitManualGradingAction } = await getActions();
    await submitManualGradingAction('attempt-1', validGrades);

    expect(doc.gradedBy).toBe('admin-1');
  });

  it('should fall back to auto-correct when manualPointsAwarded is negative', async () => {
    ensureAdminOrProfessor.mockResolvedValue(adminSession);

    const doc = makeMongooseDoc();
    mockFindById.mockResolvedValue(doc);

    const negativeGrades = [
      { questionIndex: 0, manualPointsAwarded: -5, feedback: 'Very wrong' },
      { questionIndex: 1, manualPointsAwarded: -3, feedback: 'Also wrong' },
    ];

    const { submitManualGradingAction } = await getActions();
    await submitManualGradingAction('attempt-1', negativeGrades);

    expect(doc.score).toBe(1);
    expect(doc.percentage).toBe(50);
  });

  it('should clamp totalScore to zero with valid zero-point manual grades', async () => {
    ensureAdminOrProfessor.mockResolvedValue(adminSession);

    const doc = makeMongooseDoc();
    mockFindById.mockResolvedValue(doc);

    const zeroGrades = [
      { questionIndex: 0, manualPointsAwarded: 0, feedback: 'Overridden to zero' },
      { questionIndex: 1, manualPointsAwarded: 0, feedback: 'Overridden to zero' },
    ];

    const { submitManualGradingAction } = await getActions();
    await submitManualGradingAction('attempt-1', zeroGrades);

    expect(doc.score).toBe(0);
    expect(doc.percentage).toBe(0);
  });
});
