import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────

vi.mock('@/lib/database/mongodb', () => ({
  default: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/database/tenant-model', () => ({
  withTenantContext: vi.fn((fn: () => unknown) => fn()),
}));

vi.mock('@/lib/tenant-resolver', () => ({
  resolveTargetTenantContext: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/auth/ensureQuizAccess', () => ({
  ensureAdminOrProfessor: vi.fn(),
}));

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

vi.mock('@/lib/logs-client', () => ({
  LogsClient: {
    log: vi.fn().mockResolvedValue(null),
  },
}));

// ── Import mock refs ───────────────────────────────────

import * as SessionMod from '@/lib/auth/ensureQuizAccess';
import * as ResolverMod from '@/lib/tenant-resolver';
import * as ExamAttemptMod from '@/models/ExamAttempt';
import * as LogsClientMod from '@/lib/logs-client';

const { ensureAdminOrProfessor } = SessionMod as unknown as {
  ensureAdminOrProfessor: ReturnType<typeof vi.fn>;
};
const { resolveTargetTenantContext } = ResolverMod as unknown as {
  resolveTargetTenantContext: ReturnType<typeof vi.fn>;
};
const { mockFind, mockFindById } = ExamAttemptMod as unknown as {
  mockFind: ReturnType<typeof vi.fn>;
  mockFindById: ReturnType<typeof vi.fn>;
};
const { LogsClient } = LogsClientMod as unknown as {
  LogsClient: { log: ReturnType<typeof vi.fn> };
};

// ── Types ──────────────────────────────────────────────

interface LeanAttemptDoc {
  _id: string;
  tenantId: string;
  userId: string;
  mode: 'training' | 'mock';
  score: number;
  percentage: number;
  startedAt: Date;
  endedAt?: Date;
  status: 'in_progress' | 'completed' | 'timeout';
  gradingStatus: 'auto_graded' | 'pending_manual_review' | 'manually_graded';
  gradedBy?: string;
  gradedAt?: Date;
  isInvalidated?: boolean;
  invalidatedBy?: string;
  invalidatedAt?: Date;
  examConfigId?: Record<string, unknown> | null;
  questions?: Array<Record<string, unknown>>;
}

interface MongooseDoc extends LeanAttemptDoc {
  toObject: () => Record<string, unknown>;
  save: ReturnType<typeof vi.fn>;
  questions: Array<Record<string, unknown>>;
}

// ── Helpers ────────────────────────────────────────────

function makeLeanAttempt(overrides: Partial<LeanAttemptDoc> = {}): LeanAttemptDoc {
  return {
    _id: 'attempt-1',
    tenantId: 'tenant-1',
    userId: 'student-1',
    mode: 'mock',
    score: 5,
    percentage: 50,
    startedAt: new Date('2025-06-01T10:00:00Z'),
    endedAt: new Date('2025-06-01T10:30:00Z'),
    status: 'completed',
    gradingStatus: 'auto_graded',
    ...overrides,
  };
}

function makeMongooseDoc(overrides: Partial<MongooseDoc> = {}): MongooseDoc {
  const baseQuestions = [
    {
      questionSnapshot: {
        questionText: 'What is 2+2?',
        options: ['1', '2', '3', '4'],
        correctOptionIndex: 3,
        difficulty: 'easy' as const,
      },
      selectedOptionIndex: 3,
      isCorrect: true,
      status: 'correcta' as const,
      timeSpentSeconds: 10,
    },
    {
      questionSnapshot: {
        questionText: 'What is 3+3?',
        options: ['5', '6', '7', '8'],
        correctOptionIndex: 1,
        difficulty: 'medium' as const,
      },
      selectedOptionIndex: 0,
      isCorrect: false,
      status: 'incorrecta' as const,
      timeSpentSeconds: 15,
    },
  ];

  return {
    _id: 'attempt-1',
    tenantId: 'tenant-1',
    userId: 'student-1',
    mode: 'mock' as const,
    score: 5,
    percentage: 50,
    startedAt: new Date('2025-06-01T10:00:00Z'),
    endedAt: new Date('2025-06-01T10:30:00Z'),
    status: 'completed' as const,
    gradingStatus: 'auto_graded' as const,
    gradedBy: undefined as string | undefined,
    gradedAt: undefined as Date | undefined,
    toObject: vi.fn().mockReturnValue({ _id: 'attempt-1', tenantId: 'tenant-1' }),
    save: vi.fn().mockResolvedValue(null),
    questions: [...baseQuestions],
    examConfigId: {
      _id: 'cfg-1',
      name: 'Test Config',
      passThreshold: 70,
    },
    ...overrides,
  };
}

function makeLeanAttemptWithPopulate(overrides: Partial<LeanAttemptDoc> = {}): LeanAttemptDoc {
  return {
    ...makeLeanAttempt({
      examConfigId: {
        _id: 'cfg-1',
        name: 'Test Config',
        passThreshold: 70,
      },
      ...overrides,
    }),
  };
}

const adminSession = {
  id: 'admin-1',
  tenantId: 'tenant-1',
  email: 'admin@tenant1.com',
  role: 'ADMIN' as const,
};

const superAdminSession = {
  id: 'super-1',
  tenantId: 'tenant-1',
  email: 'super@abd.com',
  role: 'SUPER_ADMIN' as const,
};

async function getActions() {
  return import('./grading');
}

// ── Tests: getAttemptsForGradingAction ─────────────────

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

    // Should NOT have gradingStatus in the query
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
    // Remove optional fields from the lean doc to simulate non-existent fields
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

// ── Tests: getAttemptDetailAction ──────────────────────

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
      maxPoints: 1, // easy → 1
    });
    expect(result!.questions[1]).toMatchObject({
      questionIndex: 1,
      questionText: 'What is 3+3?',
      isCorrect: false,
      maxPoints: 1, // medium → 1
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

// ── Tests: submitManualGradingAction ───────────────────

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
    // Manual points applied
    expect(doc.questions[0].manualPointsAwarded).toBe(1);
    expect(doc.questions[0].feedback).toBe('Correct');
    expect(doc.questions[1].manualPointsAwarded).toBe(0);
    expect(doc.questions[1].feedback).toBe('Wrong');
    // Score recalculated: 1 + 0 = 1
    expect(doc.score).toBe(1);
    // Max possible = 1 (easy) + 1 (medium) = 2, percentage = 1/2 = 50
    expect(doc.percentage).toBe(50);
    expect(doc.gradingStatus).toBe('manually_graded');
    expect(doc.gradedBy).toBe('admin@tenant1.com');
    expect(doc.gradedAt).toBeInstanceOf(Date);
    expect(doc.save).toHaveBeenCalled();
  });

  it('should reject cross-tenant grading for ADMIN (anti-IDOR)', async () => {
    ensureAdminOrProfessor.mockResolvedValue(adminSession);

    const doc = makeMongooseDoc({ tenantId: 'tenant-2' });
    mockFindById.mockResolvedValue(doc);

    const { submitManualGradingAction } = await getActions();
    const result = await submitManualGradingAction('attempt-1', validGrades);

    expect(result).toEqual({ success: false, error: 'Acceso no autorizado' });
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

    // Question 0: easy (1pt), was correct → would get 1pt auto, but we manually award 0
    // Question 1: medium (1pt), was incorrect → would get 0pt auto, but we manually award 1
    const doc = makeMongooseDoc();
    mockFindById.mockResolvedValue(doc);

    const mixedGrades = [
      { questionIndex: 0, manualPointsAwarded: 0, feedback: 'Overridden' },
      { questionIndex: 1, manualPointsAwarded: 1, feedback: 'Partial credit' },
    ];

    const { submitManualGradingAction } = await getActions();
    await submitManualGradingAction('attempt-1', mixedGrades);

    // totalScore = 0 (manual override for q0) + 1 (manual for q1) = 1
    expect(doc.score).toBe(1);
    // percentage = 1/2 = 50
    expect(doc.percentage).toBe(50);
  });

  it('should fall back to auto isCorrect for questions without manual points', async () => {
    ensureAdminOrProfessor.mockResolvedValue(adminSession);

    const doc = makeMongooseDoc();
    mockFindById.mockResolvedValue(doc);

    // Only grade question 1 (incorrect originally), leave question 0 ungraded
    const partialGrades = [
      { questionIndex: 1, manualPointsAwarded: 1, feedback: 'Partial' },
    ];

    const { submitManualGradingAction } = await getActions();
    await submitManualGradingAction('attempt-1', partialGrades);

    // q0: manualPointsAwarded undefined → falls back to isCorrect=true → 1pt
    // q1: manualPointsAwarded = 1 → 1pt
    // total = 2, max = 2, percentage = 100
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

    // Should not crash; q0 auto-corrects (1pt), q1 is incorrect (0pt)
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

    // feedback should not be set for either question
    expect(doc.questions[0].feedback).toBeUndefined();
    expect(doc.questions[1].feedback).toBeUndefined();
  });

  it('should log the grading event after success', async () => {
    ensureAdminOrProfessor.mockResolvedValue(adminSession);

    const doc = makeMongooseDoc();
    mockFindById.mockResolvedValue(doc);

    const { submitManualGradingAction } = await getActions();
    await submitManualGradingAction('attempt-1', validGrades);

    expect(LogsClient.log).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        action: 'EXAM_ATTEMPT_MANUALLY_GRADED',
        entityType: 'EXAM',
        entityId: 'attempt-1',
        userId: 'admin-1',
        userEmail: 'admin@tenant1.com',
        changedFields: expect.objectContaining({
          gradingStatus: 'manually_graded',
          score: expect.any(Number),
          percentage: expect.any(Number),
        }),
      })
    );
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

    // Negative manual points are not valid (>= 0 check), so falls back to auto:
    // q0 isCorrect=true → 1pt, q1 isCorrect=false → 0pt
    expect(doc.score).toBe(1);
    expect(doc.percentage).toBe(50);
  });

  it('should clamp totalScore to zero with valid zero-point manual grades', async () => {
    ensureAdminOrProfessor.mockResolvedValue(adminSession);

    const doc = makeMongooseDoc();
    mockFindById.mockResolvedValue(doc);

    // Override both questions to 0 manual points (bypassing auto-correct)
    const zeroGrades = [
      { questionIndex: 0, manualPointsAwarded: 0, feedback: 'Overridden to zero' },
      { questionIndex: 1, manualPointsAwarded: 0, feedback: 'Overridden to zero' },
    ];

    const { submitManualGradingAction } = await getActions();
    await submitManualGradingAction('attempt-1', zeroGrades);

    // Both questions have manualPointsAwarded=0 (valid), so total = 0
    expect(doc.score).toBe(0);
    expect(doc.percentage).toBe(0);
  });
});
